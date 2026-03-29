from __future__ import annotations

import hashlib
import hmac
import time


def verify_slack_request(
    signing_secret: str, signature: str, timestamp: str, body: bytes
) -> bool:
    """Verify Slack request signature (v0 = HMAC-SHA256 of v0:ts:body)."""
    try:
        ts = int(timestamp)
    except (TypeError, ValueError):
        return False
    if abs(int(time.time()) - ts) > 60 * 5:
        return False
    basestring = b"v0:" + timestamp.encode("utf-8") + b":" + body
    digest = hmac.new(
        signing_secret.encode("utf-8"),
        basestring,
        hashlib.sha256,
    ).hexdigest()
    expected = f"v0={digest}"
    sig_b = signature.strip().encode("utf-8")
    exp_b = expected.encode("utf-8")
    if len(sig_b) != len(exp_b):
        return False
    return hmac.compare_digest(exp_b, sig_b)
