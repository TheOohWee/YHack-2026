"""Lava API gateway — routes requests through lava.so for unified tracking/billing.

Lava forwards POST requests to any provider URL. Auth: Lava key in Authorization header,
provider key forwarded via x-api-key header (Lava passes it through to the provider).
"""

import os
import httpx

LAVA_SECRET_KEY = os.getenv("LAVA_SECRET_KEY", "")
LAVA_FORWARD_URL = "https://api.lava.so/v1/forward"


async def forward_request(provider_url: str, payload: dict, provider_api_key: str) -> dict:
    """Route a request through Lava gateway to any AI provider."""
    if not LAVA_SECRET_KEY:
        return await _direct_request(provider_url, payload, provider_api_key)

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                LAVA_FORWARD_URL,
                params={"u": provider_url},
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {LAVA_SECRET_KEY}",
                    "x-api-key": provider_api_key,
                },
                json=payload,
            )
            response.raise_for_status()
            return response.json()
    except Exception as e:
        print(f"[lava] Gateway error, falling back to direct: {e}")
        return await _direct_request(provider_url, payload, provider_api_key)


async def _direct_request(url: str, payload: dict, api_key: str) -> dict:
    """Call provider directly without Lava."""
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            url,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_key}",
            },
            json=payload,
        )
        response.raise_for_status()
        return response.json()
