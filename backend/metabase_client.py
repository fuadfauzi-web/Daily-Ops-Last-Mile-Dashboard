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
# 2026-10-03: ONE question per view, carrying everything the page needs (volume, success rate, sizing S/M/L,
# reservation waypoints, a corrected Attendance = COUNT DISTINCT route_date -- not the old route count that counted
# a driver's 2 routes in a day as 2 attendance days -- plus the driver's hub name and employment start date), so the
# Hybrid page takes 3 uploads instead of 7. They replace the old per-grain questions 127194 / 127195 / 127196, the
# sizing add-ons 127410 / 127411 / 127412 and the driver list 127193 (still in Metabase, no longer read by the app).
QUESTION_HYBRID_DAILY = 127513  # Hybrid Daily - ALL-IN-ONE feeder (current month)
QUESTION_HYBRID_WEEKLY = 127514  # Hybrid Weekly - ALL-IN-ONE feeder (current year)
QUESTION_HYBRID_MONTHLY = 127515  # Hybrid Monthly - ALL-IN-ONE feeder (current year)

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


_COLLECTION_ID = int(os.getenv("METABASE_COLLECTION_ID", "18292") or 18292)  # Last Mile collection: every question the app reads lives here (2026-10-08)
COLLECTION_URL = f"{METABASE_BASE_URL}/collection/{_COLLECTION_ID}-last-mile"


def _check_status(resp: httpx.Response, what: str) -> None:
    if resp.status_code in (401, 403):
        raise MetabaseError(f"Metabase refused {what} (HTTP {resp.status_code}) -- check the API key and that its group can see the Last Mile collection")
    if resp.status_code == 404:
        raise MetabaseError(f"Metabase could not find {what}")
    if resp.status_code >= 400:
        raise MetabaseError(f"Metabase returned HTTP {resp.status_code} for {what}")


async def fetch_question_csv(card_id: int) -> bytes:
    """The file "Download results as .csv" gives for a saved question -- the same text the manual upload used to take, so every dataset parser keeps working unchanged."""
    if not METABASE_API_KEY:
        raise MetabaseError("METABASE_API_KEY is not set on this app")
    url = f"{METABASE_BASE_URL}/api/card/{card_id}/query/csv"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT_SECONDS) as client:
            resp = await client.post(url, headers={"X-API-KEY": METABASE_API_KEY}, data={"parameters": "[]"})
    except httpx.HTTPError as exc:
        raise MetabaseError(f"Could not reach Metabase: {exc.__class__.__name__}") from exc
    _check_status(resp, f"question {card_id}")
    ctype = (resp.headers.get("content-type") or "").lower()
    if "json" in ctype:  # a failed query comes back as {"error": "..."} instead of a file
        try:
            err = resp.json()
            msg = str(err.get("error") or err)[:200] if isinstance(err, dict) else "unexpected answer"
        except ValueError:
            msg = "unexpected answer"
        raise MetabaseError(f"Metabase question {card_id} failed: {msg}")
    if "html" in ctype:
        raise MetabaseError("Metabase answered with a web page (single sign-on in front of the API?) -- see the connection check")
    return resp.content


async def list_collection(collection_id: int | None = None) -> list[dict]:
    """The saved questions inside the Last Mile collection: [{"id", "name"}], newest id last."""
    if not METABASE_API_KEY:
        raise MetabaseError("METABASE_API_KEY is not set on this app")
    cid = collection_id or _COLLECTION_ID
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.get(f"{METABASE_BASE_URL}/api/collection/{cid}/items", headers={"X-API-KEY": METABASE_API_KEY}, params={"models": "card", "limit": 500})
    except httpx.HTTPError as exc:
        raise MetabaseError(f"Could not reach Metabase: {exc.__class__.__name__}") from exc
    _check_status(resp, f"collection {cid}")
    try:
        data = resp.json()
    except ValueError as exc:
        raise MetabaseError("Metabase did not return JSON for the collection") from exc
    items = data.get("data", []) if isinstance(data, dict) else data
    return sorted(({"id": int(i["id"]), "name": str(i.get("name") or "")} for i in items if i.get("model", "card") in ("card", "dataset", "metric") and i.get("id") is not None), key=lambda q: q["id"])


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
