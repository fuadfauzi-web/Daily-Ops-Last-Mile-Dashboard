"""Thin client for running saved Metabase questions ("cards") and reading their rows.

Reads METABASE_BASE_URL / METABASE_API_KEY from the environment (declared in backend/.env.example, set as real values in the
Substrait portal after deploy). The API key must belong to a Metabase user / group that may run the questions below.

2026-09-26: the Fleet Manager connected Metabase and wants it to become the source for the data that is pasted by hand today
(the logic for each will follow); the KPI Dashboard's Hybrid Productivity module is the first user.
"""
import logging
import os

import httpx

log = logging.getLogger("metabase_client")

METABASE_BASE_URL = os.getenv("METABASE_BASE_URL", "https://metabase.ninjavan.co").rstrip("/")
METABASE_API_KEY = os.getenv("METABASE_API_KEY", "")

# Metabase question ids the KPI Dashboard's Hybrid Productivity module reads (the same questions that used to be emailed as CSV).
QUESTION_HYBRID_DAILY = 126393  # staging hybrid daily apps
QUESTION_HYBRID_WEEKLY = 126389  # staging hybrid weekly apps
QUESTION_HYBRID_MONTHLY = 126392  # staging hybrid monthly apps
QUESTION_HYBRID_DATA = 126216  # hybrid data (current year) -- driver details incl. employment start date

_TIMEOUT_SECONDS = 240


class MetabaseError(RuntimeError):
    pass


def configured() -> bool:
    return bool(METABASE_API_KEY)


async def fetch_question(card_id: int) -> list[dict]:
    """Runs a saved question and returns its rows as dicts keyed by the column display names (what the CSV export uses)."""
    if not METABASE_API_KEY:
        raise MetabaseError("METABASE_API_KEY is not set")
    url = f"{METABASE_BASE_URL}/api/card/{card_id}/query/json"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, headers={"X-API-KEY": METABASE_API_KEY, "Content-Type": "application/json"}, json={})
    except httpx.HTTPError as exc:
        raise MetabaseError(f"Could not reach Metabase: {exc.__class__.__name__}") from exc
    if resp.status_code in (401, 403):
        raise MetabaseError(f"Metabase refused question {card_id} (HTTP {resp.status_code}) -- check the API key and its permissions")
    if resp.status_code == 404:
        raise MetabaseError(f"Metabase question {card_id} was not found")
    if resp.status_code >= 400:
        raise MetabaseError(f"Metabase returned HTTP {resp.status_code} for question {card_id}")
    try:
        data = resp.json()
    except ValueError as exc:
        raise MetabaseError(f"Metabase question {card_id} did not return JSON") from exc
    if isinstance(data, dict):
        # A failed query comes back as {"error": "..."} (HTTP 200 for the export endpoints).
        raise MetabaseError(f"Metabase question {card_id} failed: {str(data.get('error') or data)[:200]}")
    return data
