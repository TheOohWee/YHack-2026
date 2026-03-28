from __future__ import annotations

import argparse
import logging
import sys

from wattsup.config import Settings
from wattsup.orchestrator import run_energy_poll


def main() -> None:
    parser = argparse.ArgumentParser(description="WattsUp eco-quant energy poll.")
    parser.add_argument("--user-id", required=True, help="Unique user identifier for MongoDB.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Compute signals but skip MongoDB writes.",
    )
    args = parser.parse_args()
    # Avoid logging full PJM request headers (subscription key) at INFO.
    logging.getLogger("gridstatus").setLevel(logging.WARNING)
    logging.getLogger("gridstatusio").setLevel(logging.WARNING)
    settings = Settings()
    try:
        ctx = run_energy_poll(args.user_id, settings, dry_run=args.dry_run)
    except RuntimeError as e:
        print(f"error: {e}", file=sys.stderr)
        sys.exit(1)
    print(
        f"ok user={ctx.user_id} score={ctx.eco_efficiency_score} "
        f"z={ctx.z_score} notify={ctx.notify} action_taken={ctx.action_taken}"
    )


if __name__ == "__main__":
    main()
