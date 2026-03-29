"""
Local-only demo: dim display when a Slack message asks to optimize energy usage
(WATTSUP_DEMO_LOCAL_ECO). Runs on the same machine as wattsup-serve.
"""

from __future__ import annotations

import logging
import platform
import shutil
import subprocess
import time
from pathlib import Path

from wattsup.config import Settings

_log = logging.getLogger(__name__)

# Case-insensitive substring match — user asks to optimize / reduce energy usage.
OPTIMIZE_ENERGY_TRIGGERS = (
    "help optimize my energy usage",
    "optimize my energy usage",
    "optimize my energy",
    "help optimize my energy",
    "help me optimize my energy usage",
    "help me optimize my energy",
    "optimize energy usage",
    "help optimize energy",
    "help optimize energy usage",
    "reduce my energy usage",
    "lower my energy usage",
    "help me save energy",
    "save on my energy",
)


def user_triggers_energy_optimize_demo(user_text: str) -> bool:
    t = user_text.strip().lower()
    return any(phrase in t for phrase in OPTIMIZE_ENERGY_TRIGGERS)


def _notify_macos(title: str, body: str) -> None:
    safe_title = title.replace('"', "'")
    safe_body = body.replace('"', "'")
    script = f'display notification "{safe_body}" with title "{safe_title}"'
    subprocess.run(
        _osascript_args("-e", script),
        check=False,
        capture_output=True,
        text=True,
        timeout=15,
    )


def _osascript_args(*args: str) -> list[str]:
    if platform.system() == "Darwin" and Path("/usr/bin/osascript").is_file():
        return ["/usr/bin/osascript", *args]
    return ["osascript", *args]


def _brightness_cli_text_indicates_failure(combined: str) -> bool:
    """`brightness` sometimes exits 0 while printing errors (e.g. IOKit -536870201 on newer macOS)."""
    o = (combined or "").lower()
    return (
        "failed to get brightness" in o
        or "failed to set brightness" in o
        or "failed to list" in o
        or "error -" in o
    )


def _brightness_macos_cli(level: float) -> bool:
    candidates = [
        shutil.which("brightness"),
        "/opt/homebrew/bin/brightness",
        "/usr/local/bin/brightness",
    ]
    exe = next((c for c in candidates if c and Path(c).is_file()), None)
    if not exe:
        return False
    # Prefer explicit built-in index 0 when multiple displays exist; then bare form.
    arg_variants: tuple[list[str], ...] = (
        [exe, "-d", "0", str(level)],
        [exe, str(level)],
    )
    try:
        for args in arg_variants:
            r = subprocess.run(
                args,
                check=False,
                capture_output=True,
                text=True,
                timeout=15,
            )
            combined = (r.stdout or "") + (r.stderr or "")
            if r.returncode != 0:
                _log.warning(
                    "brightness CLI exit %s (%s): %s",
                    r.returncode,
                    args,
                    (combined or "").strip()[:500],
                )
                continue
            if _brightness_cli_text_indicates_failure(combined):
                _log.warning(
                    "brightness CLI reported failure in output (%s): %s",
                    args,
                    (combined or "").strip()[:500],
                )
                continue
            return True
        return False
    except (OSError, subprocess.TimeoutExpired) as e:
        _log.warning("brightness CLI failed: %s", e)
        return False


def _brightness_macos_applescript_set(level: float) -> bool:
    apple = (
        'tell application "System Events"\n'
        f"    set brightness of current display to {level}\n"
        "end tell"
    )
    try:
        r = subprocess.run(
            _osascript_args("-e", apple),
            check=False,
            capture_output=True,
            text=True,
            timeout=15,
        )
        if r.returncode == 0:
            return True
        _log.debug("osascript set brightness stderr: %s", (r.stderr or "")[:300])
    except (OSError, subprocess.TimeoutExpired) as e:
        _log.warning("osascript set brightness failed: %s", e)
    return False


def _brightness_macos_key_down(steps: int) -> bool:
    steps = max(1, min(72, steps))
    apple = (
        'tell application "System Events"\n'
        f"    repeat with i from 1 to {steps}\n"
        "        key code 145\n"
        "        delay 0.05\n"
        "    end repeat\n"
        "end tell"
    )
    try:
        r = subprocess.run(
            _osascript_args("-e", apple),
            check=False,
            capture_output=True,
            text=True,
            timeout=90,
        )
        if r.returncode == 0:
            return True
        _log.debug("osascript key 145 stderr: %s", (r.stderr or "")[:300])
    except (OSError, subprocess.TimeoutExpired) as e:
        _log.warning("osascript key 145 failed: %s", e)
    return False


def _brightness_macos(level: float) -> tuple[bool, str]:
    if _brightness_macos_cli(level):
        pct = max(1, int(round(level * 100)))
        return True, f"Set display to ~{pct}% via `brightness` CLI."

    # CLI often fails on newest macOS (IOKit); key simulation is the reliable dim path if Accessibility is on.
    steps = int(round((1.0 - level) * 56))
    steps = min(72, max(14, steps))
    if _brightness_macos_key_down(steps):
        return (
            True,
            f"Dimmed via {steps}× brightness-down keys (System Events). "
            "`brightness` CLI was skipped or failed on this macOS.",
        )

    if _brightness_macos_applescript_set(level):
        return True, "Set display brightness via System Events (AppleScript)."

    return False, ""


_MACOS_BRIGHTNESS_HELP = (
    "Enable Accessibility for the app running wattsup-serve (e.g. Terminal, iTerm2, Cursor): System "
    "Settings → Privacy & Security → Accessibility. On recent macOS the `brew install brightness` "
    "CLI often cannot change the built-in panel (IOKit errors); simulated brightness keys need "
    "Accessibility to dim the display."
)


def _brightness_windows(percent: int) -> bool:
    percent = max(1, min(100, percent))
    cmd = (
        f"(Get-WmiObject -Namespace root/WMI -Class WmiMonitorBrightnessMethods)"
        f".WmiSetBrightness(1,{percent})"
    )
    try:
        subprocess.run(
            ["powershell", "-NoProfile", "-Command", cmd],
            check=True,
            capture_output=True,
            text=True,
            timeout=30,
        )
        return True
    except (subprocess.CalledProcessError, OSError, subprocess.TimeoutExpired) as e:
        _log.warning("Windows WMI brightness failed: %s", e)
        return False


def trigger_eco_mode(settings: Settings) -> tuple[bool, str]:
    """
    Apply local display dim after an energy-optimization Slack message.
    """
    level = float(settings.demo_local_eco_brightness or 0.2)
    level = max(0.01, min(1.0, level))

    system = platform.system()
    _log.info(
        "[energy optimize demo] initiating on %s (target brightness ~%.1f%%)",
        system,
        level * 100,
    )
    time.sleep(0.8)

    if system == "Darwin":
        _notify_macos(
            "WattsUp",
            "Optimizing for lower display power — dimming your screen for this demo.",
        )
        ok, detail = _brightness_macos(level)
        if ok:
            return True, f"macOS: {detail} Notification sent."
        return (
            False,
            "macOS: notification sent; brightness unchanged. " + _MACOS_BRIGHTNESS_HELP,
        )

    if system == "Windows":
        pct = max(1, int(round(level * 100)))
        ok = _brightness_windows(pct)
        if ok:
            return True, f"Display brightness set toward {pct}% (Windows)."
        return False, "Windows: could not set brightness (try running as Administrator)."

    return False, f"Display demo not implemented on {system}."


def maybe_local_eco_followup(settings: Settings, user_text: str) -> str | None:
    if not settings.demo_local_eco:
        return None
    if not user_triggers_energy_optimize_demo(user_text):
        return None
    try:
        ok, detail = trigger_eco_mode(settings)
    except Exception:
        _log.exception("local energy-optimize demo crashed")
        return "Local display demo hit an error — check the wattsup-serve terminal logs."
    if ok:
        return detail
    return f"Local display demo: {detail}"
