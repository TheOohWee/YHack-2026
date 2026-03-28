"""Local HTTP API for WattsUp (health + trigger poll)."""

from __future__ import annotations

import logging

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from wattsup.config import Settings
from wattsup.orchestrator import run_energy_poll

logging.getLogger("gridstatus").setLevel(logging.WARNING)
logging.getLogger("gridstatusio").setLevel(logging.WARNING)

app = FastAPI(title="WattsUp", version="0.1.0", description="Eco-quant energy poll API.")


class PollRequest(BaseModel):
    user_id: str = Field(..., min_length=1)
    dry_run: bool = False


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/poll")
def poll(body: PollRequest) -> dict:
    settings = Settings()
    try:
        ctx = run_energy_poll(body.user_id, settings, dry_run=body.dry_run)
    except RuntimeError as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
    return {
        "user_id": ctx.user_id,
        "eco_efficiency_score": ctx.eco_efficiency_score,
        "renewable_pct": ctx.renewable_pct,
        "z_score": ctx.z_score,
        "notify": ctx.notify,
        "action_taken": ctx.action_taken,
    }


def main() -> None:
    import uvicorn

    s = Settings()
    uvicorn.run(app, host=s.wattsup_host, port=s.wattsup_port)


if __name__ == "__main__":
    main()
