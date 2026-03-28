from __future__ import annotations

import re
from concurrent.futures import ThreadPoolExecutor, TimeoutError as FuturesTimeout
from datetime import datetime, timedelta, timezone
import pandas as pd

from wattsup.config import Settings
from wattsup.models import FuelMix, PollContext
from wattsup.tools.base import AgentTool, ToolResult


def _norm(name: str) -> str:
    return re.sub(r"\s+", " ", str(name).strip().lower())


# Normalized fuel labels from GridStatus.io (pjm_fuel_mix / miso_fuel_mix tidy rows),
# PJM Data Miner wide columns, and open-source gridstatus — mapped to internal buckets.
_EXACT_FUEL_BUCKET: dict[str, str] = {
    # Wind / solar
    "wind": "wind",
    "onshore wind": "wind",
    "offshore wind": "wind",
    "wind resource": "wind",
    "solar": "solar",
    "solar resource": "solar",
    "pv": "solar",
    "photovoltaic": "solar",
    # Fossil — PJM / ISO wording
    "coal": "fossil",
    "gas": "fossil",
    "natural gas": "fossil",
    "other fossils": "fossil",
    "other fossil": "fossil",
    "oil": "fossil",
    "diesel": "fossil",
    "kerosene": "fossil",
    "jet": "fossil",
    "jet fuel": "fossil",
    "dual fuel": "fossil",
    "multiple fuels": "fossil",
    "synthetic gas": "fossil",
    "blast furnace gas": "fossil",
    "refinery gases": "fossil",
    "other gases": "fossil",
    "pet coke": "fossil",
    "petroleum coke": "fossil",
    "waste coal": "fossil",
    "waste coal steam": "fossil",
    "steam": "fossil",
    "methane": "fossil",
    "msw": "fossil",  # municipal solid waste incineration — often counted fossil; stable UI bucket
    "nuclear": "nuclear",
    # Hydro — own bucket for Mongo + UI
    "hydro": "hydro",
    "hydroelectric": "hydro",
    # Other renewables (count toward renewable % for eco score; biomass, storage, etc.)
    "other renewable": "renew_other",
    "other renewables": "renew_other",
    "renewables": "renew_other",
    "biomass": "renew_other",
    "wood": "renew_other",
    "black liquor": "renew_other",
    "landfill gas": "renew_other",
    "geothermal": "renew_other",
    "energy storage": "renew_other",
    "storage": "renew_other",
    "pumped storage": "renew_other",
    "pumped": "renew_other",
    "battery": "renew_other",
}


def _fuel_type_bucket(label: str) -> str | None:
    """
    Classify fuel labels into buckets for FuelMix + renewable %.
    None → MW counted in other_pct (imports, synch cond, unknown).
    """
    n = _norm(label)
    if not n:
        return None
    if n in _EXACT_FUEL_BUCKET:
        return _EXACT_FUEL_BUCKET[n]

    if "synch" in n and "cond" in n:
        return None

    # MISO / PJM compound names (substring, order matters)
    if "waste coal" in n or "pet coke" in n or "petroleum coke" in n:
        return "fossil"
    if "landfill gas" in n:
        return "renew_other"

    if "nuclear" in n or "uranium" in n:
        return "nuclear"

    if (
        "hydro" in n
        or "water power" in n
        or "run of river" in n
        or "run-of-river" in n
    ):
        return "hydro"

    if "wind" in n:
        return "wind"
    if "solar" in n or "photovoltaic" in n or re.search(r"\bpv\b", n):
        return "solar"

    if any(
        tok in n
        for tok in (
            "coal",
            "gas",
            "ct",
            "cc",
            "combined cycle",
            "simple cycle",
            "peaking",
            "steam turbine",
            "fossil",
            "oil",
            "diesel",
            "kerosene",
            "petroleum",
            "fuel oil",
            "dual fuel",
            "multi fuel",
            "methane",
            "shale",
            "lng",
        )
    ):
        return "fossil"

    if any(
        tok in n
        for tok in (
            "biomass",
            "geothermal",
            "storage",
            "pumped",
            "battery",
            "renewable",
            "other renew",
            "wood",
            "black liquor",
        )
    ):
        return "renew_other"

    return None


def _latest_fuel_percents(row: pd.Series) -> tuple[FuelMix, float]:
    """
    Latest-interval MW Series indexed by fuel name → FuelMix + aggregate renewable %.
    Uses explicit PJM/MISO/GridStatus label mapping so the MongoDB schema stays stable.
    """
    num = pd.to_numeric(row, errors="coerce")
    total = float(num.sum())
    if total <= 0:
        raise ValueError("Fuel mix totals to zero MW.")

    wind_mw = solar_mw = fossil_mw = nuclear_mw = hydro_mw = renew_other_mw = unmapped_mw = 0.0
    for col in num.index:
        v = num[col]
        if pd.isna(v):
            continue
        mw = float(v)
        if mw == 0.0:
            continue
        bucket = _fuel_type_bucket(str(col))
        if bucket == "wind":
            wind_mw += mw
        elif bucket == "solar":
            solar_mw += mw
        elif bucket == "fossil":
            fossil_mw += mw
        elif bucket == "nuclear":
            nuclear_mw += mw
        elif bucket == "hydro":
            hydro_mw += mw
        elif bucket == "renew_other":
            renew_other_mw += mw
        else:
            unmapped_mw += mw

    scale = 100.0 / total
    fuel = FuelMix(
        wind_pct=wind_mw * scale,
        solar_pct=solar_mw * scale,
        fossil_pct=min(100.0, fossil_mw * scale),
        nuclear_pct=nuclear_mw * scale,
        hydro_pct=hydro_mw * scale,
        other_pct=min(100.0, (renew_other_mw + unmapped_mw) * scale),
    )
    renew_pct = min(
        100.0,
        (wind_mw + solar_mw + hydro_mw + renew_other_mw) * scale,
    )
    return fuel, renew_pct


def _fuel_mix_row_wide(df: pd.DataFrame) -> pd.Series:
    skip = {"Time", "Interval Start", "Interval End", "interval_start_utc", "interval_end_utc"}
    body = df.drop(columns=[c for c in skip if c in df.columns], errors="ignore")
    last = body.tail(1).iloc[0]
    num = pd.to_numeric(last, errors="coerce")
    return num[num.notna()]


def _io_tidy_fuel_to_series(df: pd.DataFrame) -> pd.Series:
    """Latest interval from long-form GridStatus.io fuel mix (fuel_type + mw)."""
    time_col = "interval_start_utc" if "interval_start_utc" in df.columns else None
    if not time_col:
        raise ValueError("expected interval_start_utc in GridStatus.io fuel mix frame")
    df = df.copy()
    df[time_col] = pd.to_datetime(df[time_col], utc=True, format="ISO8601")
    tmax = df[time_col].max()
    sub = df[df[time_col] == tmax]
    ft_col = next((c for c in ("fuel_type", "Fuel Type") if c in sub.columns), None)
    mw_col = next((c for c in ("mw", "MW") if c in sub.columns), None)
    if ft_col is None or mw_col is None:
        raise ValueError("fuel mix rows missing fuel_type or mw column")
    g = sub.groupby(sub[ft_col].astype(str).str.strip(), as_index=True)[mw_col].sum()
    return pd.Series(g.values, index=g.index.astype(str))


def _fuel_series_from_io_dataframe(df: pd.DataFrame) -> pd.Series:
    if df.empty:
        raise ValueError("GridStatus.io returned no fuel mix rows.")
    if "fuel_type" in df.columns or "Fuel Type" in df.columns:
        return _io_tidy_fuel_to_series(df)
    if "interval_start_utc" in df.columns:
        d = df.copy()
        d["interval_start_utc"] = pd.to_datetime(
            d["interval_start_utc"], utc=True, format="ISO8601"
        )
        tmax = d["interval_start_utc"].max()
        sub = d[d["interval_start_utc"] == tmax]
        return _fuel_mix_row_wide(sub.reset_index(drop=True))
    return _fuel_mix_row_wide(df)


def _comed_load_mw(load_df: pd.DataFrame) -> float | None:
    if load_df.empty:
        return None
    last = load_df.tail(1).iloc[0]
    for key in ("COMED", "ComEd", "comed"):
        if key in load_df.columns and pd.notna(last.get(key)):
            return float(last[key])
    for key in ("PJM RTO", "pjm rto", "RTO", "PJM MID ATLANTIC REGION"):
        if key in load_df.columns and pd.notna(last.get(key)):
            return float(last[key])
    if "Load" in load_df.columns and pd.notna(last.get("Load")):
        return float(last["Load"])
    return None


class GridStatusFuelMixTool(AgentTool):
    name = "gridstatus_pjm_fuel_mix"
    description = (
        "PJM fuel mix + load: GridStatus.io API if GRIDSTATUS_API_KEY is set, "
        "else open-source gridstatus with PJM_API_KEY."
    )

    def _run_gridstatus_io(self, ctx: PollContext, settings: Settings) -> ToolResult[FuelMix]:
        try:
            from gridstatusio import GridStatusClient
        except ImportError as e:
            return ToolResult(ok=False, error=f"gridstatusio import failed: {e}")

        end = datetime.now(timezone.utc).date()
        start = end - timedelta(days=2)

        def _fetch() -> pd.DataFrame:
            client = GridStatusClient(
                api_key=settings.gridstatus_api_key,
                max_retries=3,
                base_delay=1.0,
            )
            return client.get_dataset(
                dataset=settings.gridstatus_io_fuel_dataset,
                start=str(start),
                end=str(end),
                limit=min(settings.gridstatus_io_row_limit, 50_000),
                timezone="market",
                verbose=False,
            )

        try:
            with ThreadPoolExecutor(max_workers=1) as pool:
                fut = pool.submit(_fetch)
                mix_df = fut.result(timeout=settings.gridstatus_timeout_seconds)
        except FuturesTimeout:
            return ToolResult(
                ok=False,
                error=(
                    "GridStatus.io request timed out. "
                    "Try increasing GRIDSTATUS_TIMEOUT_SECONDS."
                ),
            )
        except Exception as e:
            return ToolResult(
                ok=False,
                error=f"GridStatus.io error: {type(e).__name__}: {e}",
            )

        try:
            row = _fuel_series_from_io_dataframe(mix_df)
            row.index = row.index.map(lambda x: _norm(str(x)))
            fuel, renew_pct = _latest_fuel_percents(row)
            ctx.fuel_mix = fuel
            ctx.renewable_pct = renew_pct
            ctx.local_demand_mw = None
            return ToolResult(ok=True, data=fuel)
        except Exception as e:
            return ToolResult(
                ok=False,
                error=f"Could not parse GridStatus.io fuel mix: {type(e).__name__}: {e}",
            )

    def _run_pjm_opensource(
        self, ctx: PollContext, settings: Settings
    ) -> ToolResult[FuelMix]:
        if not settings.pjm_api_key:
            return ToolResult(
                ok=False,
                error="PJM_API_KEY is not set.",
            )
        try:
            from gridstatus import PJM
        except ImportError as e:
            return ToolResult(ok=False, error=f"gridstatus import failed: {e}")

        pjm = PJM(api_key=settings.pjm_api_key)

        def _fetch() -> tuple[pd.DataFrame, pd.DataFrame]:
            mix = pjm.get_fuel_mix("latest")
            load = pjm.get_load("latest")
            return mix, load

        try:
            with ThreadPoolExecutor(max_workers=1) as pool:
                fut = pool.submit(_fetch)
                mix_df, load_df = fut.result(timeout=settings.gridstatus_timeout_seconds)
        except FuturesTimeout:
            return ToolResult(
                ok=False,
                error=(
                    "PJM open-source GridStatus call timed out. "
                    "Try increasing GRIDSTATUS_TIMEOUT_SECONDS or retry later."
                ),
            )
        except Exception as e:
            return ToolResult(
                ok=False,
                error=f"PJM (open-source) error: {type(e).__name__}: {e}",
            )

        try:
            row = _fuel_mix_row_wide(mix_df)
            fuel, renew_pct = _latest_fuel_percents(row)
            ctx.fuel_mix = fuel
            ctx.renewable_pct = renew_pct
            ctx.local_demand_mw = _comed_load_mw(load_df)
            return ToolResult(ok=True, data=fuel)
        except Exception as e:
            return ToolResult(
                ok=False,
                error=f"Could not parse PJM fuel mix or load: {type(e).__name__}: {e}",
            )

    def run(self, ctx: PollContext, settings: Settings) -> ToolResult[FuelMix]:
        if settings.gridstatus_api_key:
            io_res = self._run_gridstatus_io(ctx, settings)
            if io_res.ok:
                return io_res
            if settings.pjm_api_key:
                return self._run_pjm_opensource(ctx, settings)
            return io_res

        if settings.pjm_api_key:
            return self._run_pjm_opensource(ctx, settings)

        return ToolResult(
            ok=False,
            error=(
                "Set GRIDSTATUS_API_KEY (GridStatus.io, recommended) or "
                "PJM_API_KEY (PJM Data Miner for open-source gridstatus)."
            ),
        )
