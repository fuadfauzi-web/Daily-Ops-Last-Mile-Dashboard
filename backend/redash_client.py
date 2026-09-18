"""Thin client for pulling query results out of Redash.

Reads REDASH_BASE_URL / REDASH_API_KEY from the environment (declared in
backend/.env.example, set as real values in the Substrait portal after deploy).
"""
import os

import httpx

REDASH_BASE_URL = os.getenv("REDASH_BASE_URL", "").rstrip("/")
REDASH_API_KEY = os.getenv("REDASH_API_KEY", "")

# Query IDs this app depends on (see backend/aggregate.py for how each is used).
QUERY_HEALTH_V3 = 78  # parcel-level: in-hub / zero-attempt / on-hold / aging
QUERY_ACTIVE_MISSING = 1297  # open missing-parcel tickets


class RedashError(RuntimeError):
    pass


async def fetch_query_results(query_id: int) -> list[dict]:
    """Return the rows of a Redash query's latest cached result.

    Uses the lightweight `/results.json` endpoint (reads the last-computed result;
    does not force a re-run — Redash query 1465 already refreshes itself hourly on
    its own schedule, and we don't want to trigger expensive re-runs on every call).
    """
    if not REDASH_BASE_URL or not REDASH_API_KEY:
        raise RedashError("REDASH_BASE_URL / REDASH_API_KEY not configured")

    url = f"{REDASH_BASE_URL}/api/queries/{query_id}/results.json"
    async with httpx.AsyncClient(timeout=90) as client:
        resp = await client.get(url, headers={"Authorization": f"Key {REDASH_API_KEY}"})
        resp.raise_for_status()
        data = resp.json()
    try:
        return data["query_result"]["data"]["rows"]
    except (KeyError, TypeError) as exc:
        raise RedashError(f"Unexpected response shape from query {query_id}") from exc
