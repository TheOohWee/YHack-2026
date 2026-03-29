"""Proactive 'streak grew' pings — same channels as price alerts."""

from __future__ import annotations

import logging

from wattsup.config import Settings
from wattsup.db import fetch_latest_energy_row, get_collection
from wattsup.tools.push_notification import send_user_push_text

_log = logging.getLogger(__name__)


def notify_streak_milestone_grew(
    settings: Settings,
    user_id: str,
    prev_current: int,
    new_current: int,
) -> None:
    """Agentic praise when the clean-energy streak increments (after Mongo updates)."""
    if new_current <= prev_current:
        return

    coll = get_collection(settings)
    last = fetch_latest_energy_row(coll, user_id) or {}

    active = bool(last.get("action_taken"))
    grid_z = last.get("grid_stress_z")
    grid_hi = isinstance(grid_z, (int, float)) and float(grid_z) >= settings.streak_grid_stress_sigma
    ez = last.get("z_score")
    eco_stress = isinstance(ez, (int, float)) and float(ez) <= -settings.zscore_sigma

    if active:
        body = (
            f"Nice — that explicit WattWise choice counts. "
            f"Your Clean Energy Streak is now {new_current} "
            f"{'days' if new_current != 1 else 'day'}. Your Eco-Tree just leveled up."
        )
    elif grid_hi:
        body = (
            f"I noticed you kept your usage steady during a coal-heavy grid spike. "
            f"Your Clean Energy Streak is now {new_current} "
            f"{'days' if new_current != 1 else 'day'}. Your Eco-Tree just leveled up."
        )
    elif eco_stress:
        body = (
            f"You held the line while the grid looked rough (efficiency dip vs your norm). "
            f"Clean Energy Streak: {new_current} "
            f"{'days' if new_current != 1 else 'day'}. Your Eco-Tree just leveled up."
        )
    else:
        body = (
            f"Your Clean Energy Streak is now {new_current} "
            f"{'days' if new_current != 1 else 'day'}. Your Eco-Tree just leveled up."
        )

    text = f"✅ {body}"
    ok, meta = send_user_push_text(settings, user_id, text)
    if ok:
        _log.info("streak celebration push sent user=%s streak=%s", user_id, new_current)
    else:
        _log.debug("streak celebration push skipped user=%s meta=%s", user_id, meta)
