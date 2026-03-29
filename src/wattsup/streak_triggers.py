"""Phrases that credit an **active** Clean Energy streak win (Slack / Telegram / etc.)."""

from __future__ import annotations

import logging
import re

from wattsup.config import Settings
from wattsup.demo_hardware import user_triggers_energy_optimize_demo
from wattsup.streaks import (
    maybe_bump_demo_streak_on_agent_opt_in,
    record_active_streak_win,
    update_green_streak_for_user,
)

_log = logging.getLogger(__name__)

_WATTWISE = re.compile(r"wattwise[\s_-]*optimize|/wattwise-optimize", re.I)
_SHIFT_YES = re.compile(
    r"\b(yes|yep|yeah|sure)[,.\s]+(shift|move)\s+(my\s+)?load\b", re.I
)


def user_earned_active_streak_credit(user_text: str) -> bool:
    if not user_text or not user_text.strip():
        return False
    t = user_text.strip()
    if _WATTWISE.search(t):
        return True
    if _SHIFT_YES.search(t):
        return True
    return user_triggers_energy_optimize_demo(t)


def apply_active_streak_if_eligible(
    settings: Settings, user_id: str, user_text: str, *, source: str
) -> None:
    if not user_earned_active_streak_credit(user_text):
        return
    try:
        record_active_streak_win(settings, user_id, source=source)
        update_green_streak_for_user(settings, user_id)
        maybe_bump_demo_streak_on_agent_opt_in(settings, user_id)
    except Exception:
        _log.exception("active streak credit failed for user_id=%s", user_id)
