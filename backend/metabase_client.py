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



def _clean(value: str) -> str:
    """A secret pasted into a portal often carries a trailing newline / space or wrapping quotes -- Metabase then says 401."""
    return (value or "").strip().strip("\"'").strip()


METABASE_BASE_URL = _clean(os.getenv("METABASE_BASE_URL", "https://metabase.ninjavan.co")).rstrip("/")
METABASE_API_KEY = _clean(os.getenv("METABASE_API_KEY", ""))

# Metabase question ids the KPI Dashboard's Hybrid Productivity module reads. These are the ALL-REGIONS copies (2026-09-26) of the
# Southern questions the team used to download as CSV: identical columns / aggregations / other filters, only the
# depot_region (hub_region for the driver list) = South filter removed. Originals: 126393 daily, 126389 weekly, 126392 monthly, 126216 data.
QUESTION_HYBRID_DAILY = 127196  # Hybrid Daily Apps - All Regions (current month)
QUESTION_HYBRID_WEEKLY = 127194  # Hybrid Weekly Apps - All Regions (current year)
QUESTION_HYBRID_MONTHLY = 127195  # Hybrid Monthly Apps - All Regions (current year)
QUESTION_HYBRID_DATA = 127193  # Hybrid Data Current Year - All Regions -- driver details incl. employment start date

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


def _verdict(out: dict) -> str:
    if not out["key_present"]:
        return "METABASE_API_KEY is empty on this app. Set the secret in the portal (Secrets) and press Redeploy -- secrets are only read when the app starts."
    checks = out["checks"]
    first = checks[0] if checks else {}
    if "error" in first:
        return f"The app could not reach {out['base_url']} ({first['error']}). Check METABASE_BASE_URL, and that Metabase is reachable from the cluster."
    status = first.get("status")
    if status == 200:
        card = checks[1] if len(checks) > 1 else {}
        if card.get("status") == 200:
            return "The key is accepted and can see the weekly question. Metabase is connected -- refresh the KPI page."
        return f"The key is accepted, but the weekly question answered HTTP {card.get('status')}: the key's group needs access to that question's collection (Metabase Admin -> Permissions)."
    html = "html" in (first.get("content_type") or "").lower() or first.get("redirect")
    if html:
        return ("Something in front of Metabase (single sign-on / a gateway) answers server calls with a login page before Metabase sees the key. "
                "Ask the Metabase admin for API access that bypasses the SSO page for this app.")
    hints = []
    if not out["key_starts_with_mb_"]:
        hints.append("Metabase API keys start with mb_ -- this one doesn't, so it may be a different kind of token (a session id, a Redash key) or copied incompletely")
    if out["key_had_spaces_or_quotes"]:
        hints.append("the stored value had spaces / quotes around it (the app strips them now, so redeploy and retry)")
    hints.append("create a NEW key in Metabase (Admin -> Settings -> Authentication -> API keys), give it a group that can view the KPI questions, copy it once, and paste it with no spaces")
    return f"Metabase does not recognise the key (HTTP {status}). " + "; ".join(hints) + "."


async def diagnose() -> dict:
    """What Metabase answers to this app's key -- for the KPI page's 'Check Metabase connection'. Never returns the key."""
    raw = os.getenv("METABASE_API_KEY", "")
    out: dict = {
        "base_url": METABASE_BASE_URL,
        "key_present": bool(METABASE_API_KEY),
        "key_length": len(METABASE_API_KEY),
        "key_starts_with_mb_": METABASE_API_KEY.startswith("mb_"),
        "key_had_spaces_or_quotes": raw != METABASE_API_KEY,
        "checks": [],
    }
    if METABASE_API_KEY:
        async with httpx.AsyncClient(timeout=30, follow_redirects=False) as client:
            for label, path in (
                ("Who is this key? (GET /api/user/current)", "/api/user/current"),
                (f"Weekly question (GET /api/card/{QUESTION_HYBRID_WEEKLY})", f"/api/card/{QUESTION_HYBRID_WEEKLY}"),
            ):
                item: dict = {"name": label}
                try:
                    resp = await client.get(f"{METABASE_BASE_URL}{path}", headers={"X-API-KEY": METABASE_API_KEY})
                    item.update(status=resp.status_code, content_type=resp.headers.get("content-type"), redirect=resp.headers.get("location"))
                    if resp.status_code != 200:
                        item["snippet"] = resp.text[:200].replace(METABASE_API_KEY, "***")
                except httpx.HTTPError as exc:
                    item["error"] = exc.__class__.__name__
                out["checks"].append(item)
    out["verdict"] = _verdict(out)
    return out
