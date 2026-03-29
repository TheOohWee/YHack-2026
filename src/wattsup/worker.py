from __future__ import annotations

import argparse
import logging
import signal
import time

from wattsup.config import Settings
from wattsup.orchestrator import run_energy_poll

_log = logging.getLogger("wattsup.worker")
_stop = False


def _handle_stop(signum: int, _frame: object) -> None:
    global _stop
    _stop = True
    _log.info("received signal %s, stopping after current poll", signum)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run wattsup-poll on an interval for autonomous time-series logging."
    )
    parser.add_argument("--user-id", required=True, help="MongoDB user_id for energy_logs.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute signals but skip MongoDB writes (still sleeps on interval).",
    )
    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    logging.getLogger("gridstatus").setLevel(logging.WARNING)
    logging.getLogger("gridstatusio").setLevel(logging.WARNING)

    signal.signal(signal.SIGTERM, _handle_stop)
    signal.signal(signal.SIGINT, _handle_stop)

    settings = Settings()
    interval = settings.poll_interval_seconds
    _log.info("worker start user=%s interval=%ss", args.user_id, interval)

    while not _stop:
        try:
            ctx = run_energy_poll(args.user_id, settings, dry_run=args.dry_run)
            _log.info(
                "poll ok score=%s z=%s notify=%s action=%s",
                ctx.eco_efficiency_score,
                ctx.z_score,
                ctx.notify,
                ctx.action_taken,
            )
        except RuntimeError as e:
            _log.error("poll failed: %s", e)
        except Exception:
            _log.exception("unexpected poll error")

        for _ in range(interval):
            if _stop:
                break
            time.sleep(1)

    _log.info("worker exit")


if __name__ == "__main__":
    main()
