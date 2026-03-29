"""Normalize LLM output for chat, Slack, and push — no markdown clutter."""

from __future__ import annotations

import re


def format_user_facing_reply(text: str) -> str:
    """Strip common markdown and tighten whitespace for plain-text channels."""
    if not text or not isinstance(text, str):
        return (text or "").strip()
    s = text.strip()
    # Stray code fences
    s = re.sub(r"^```(?:\w*)?\s*", "", s, flags=re.MULTILINE)
    s = re.sub(r"\s*```$", "", s, flags=re.MULTILINE)
    s = re.sub(r"\[([^\]]*)\]\([^)]*\)", r"\1", s)

    def _strip_headers(line: str) -> str:
        return re.sub(r"^#{1,6}\s+", "", line)

    s = "\n".join(_strip_headers(line) for line in s.split("\n"))
    s = s.replace("**", "").replace("__", "")
    s = re.sub(r"`+", "", s)

    lines_out: list[str] = []
    for line in s.split("\n"):
        m = re.match(r"^(\*|-)\s+(.+)$", line)
        if m:
            lines_out.append(f"• {m.group(2)}")
        else:
            lines_out.append(line)
    s = "\n".join(lines_out)
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    s = re.sub(r" {2,}", " ", s)
    return s.strip()
