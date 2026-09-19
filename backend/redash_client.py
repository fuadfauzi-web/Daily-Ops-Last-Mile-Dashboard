"""Thin client for pulling query results out of Redash.

Reads REDASH_BASE_URL / REDASH_API_KEY from the environment (declared in
backend/.env.example, set as real values in the Substrait portal after deploy).
"""
import asyncio
import logging
import os

import httpx

log = logging.getLogger("redash_client")

REDASH_BASE_URL = os.getenv("REDASH_BASE_URL", "").rstrip("/")
REDASH_API_KEY = os.getenv("REDASH_API_KEY", "")

# Query IDs this app depends on (see backend/aggregate.py for how each is used).
QUERY_HEALTH_V3 = 78  # parcel-level: in-hub / zero-attempt / on-hold / reschedule / age>3 / prior / OVFD
QUERY_ACTIVE_MISSING = 1297  # open missing-parcel tickets
QUERY_TOTAL_SHIPMENTS = 653  # per-hub total orders today ("Total Fresh")
QUERY_DELIVERY_PERFORMANCE = 512  # route-level: Total Routed / Attendance / COD % / Routed View
QUERY_SHIPMENT_TRACKER = 1239  # Fresh Unscan / Latlong / Fresh Attempt %
QUERY_LH_TIMING = 1500  # Line-haul trip arrivals: Total Shipment / LH Timing
QUERY_ZALORA_NXD = 1296  # KAM: Active Zalora NXD Parcels -- Shipper Watch
QUERY_RESTOCK_NXD = 1585  # Restock NXD -- Shipper Watch
QUERY_UNSWEEP = 58  # Unswept tracking numbers -- Station Health's Unsweep column
QUERY_OLD_ROUTE = 1451  # "XB: Aging OVFD Parcels" -- TNs stuck on an old Route ID/date
QUERY_RPU = 1397  # OPEX: LM RPU Monitoring -- RPU tab

_JOB_POLL_INTERVAL_SECONDS = 2
_JOB_POLL_TIMEOUT_SECONDS = 90
# Redash job status codes: 1=pending, 2=started, 3=success, 4=failure, 5=cancelled.
_JOB_DONE_STATUSES = {3, 4, 5}


class RedashError(RuntimeError):
    pass


async def _trigger_refresh(client: httpx.AsyncClient, query_id: int, headers: dict) -> None:
    """Best-effort: ask Redash to actually re-run the query against live data,
    instead of just reading whatever it last happened to compute. Previously
    the Fleet Manager kept this fresh by hand (a scheduled Chrome + autoclicker
    setup opening every query and clicking Refresh -- unreliable when the
    laptop failed to wake or errored).

    Silently no-ops on a 401/403 (some Redash API keys are view/download-only
    and can't trigger a run) or a request failure -- the caller then just gets
    Redash's last cached result, same as before this existed."""
    try:
        resp = await client.post(f"{REDASH_BASE_URL}/api/queries/{query_id}/refresh", headers=headers)
    except httpx.HTTPError:
        log.warning("Could not reach Redash to refresh query %d", query_id)
        return
    if resp.status_code in (401, 403):
        log.warning(
            "Redash query %d refresh forbidden (HTTP %d) -- the API key looks view/download-only; "
            "the dashboard will keep showing whatever Redash last computed on its own schedule",
            query_id, resp.status_code,
        )
        return
    if resp.status_code != 200:
        log.warning("Redash query %d refresh request failed (HTTP %d)", query_id, resp.status_code)
        return
    job = (resp.json() or {}).get("job") or {}
    job_id = job.get("id")
    if not job_id:
        return

    elapsed = 0
    while elapsed < _JOB_POLL_TIMEOUT_SECONDS:
        await asyncio.sleep(_JOB_POLL_INTERVAL_SECONDS)
        elapsed += _JOB_POLL_INTERVAL_SECONDS
        try:
            job_resp = await client.get(f"{REDASH_BASE_URL}/api/jobs/{job_id}", headers=headers)
            job_resp.raise_for_status()
        except httpx.HTTPError:
            return
        status = ((job_resp.json() or {}).get("job") or {}).get("status")
        if status in _JOB_DONE_STATUSES:
            return
    log.warning("Redash query %d refresh still running after %ds -- using whatever result is available now", query_id, elapsed)


async def fetch_query_results(query_id: int, force_refresh: bool = True) -> list[dict]:
    """Return the rows of a Redash query's latest result.

    force_refresh (default True) first asks Redash to re-run the query and
    waits for it to finish, so the numbers reflect live data rather than
    whatever Redash's own schedule last computed. Pass False to skip that and
    just read the cached result immediately (cheap, but can be stale).
    """
    if not REDASH_BASE_URL or not REDASH_API_KEY:
        raise RedashError("REDASH_BASE_URL / REDASH_API_KEY not configured")

    headers = {"Authorization": f"Key {REDASH_API_KEY}"}
    async with httpx.AsyncClient(timeout=90) as client:
        if force_refresh:
            await _trigger_refresh(client, query_id, headers)
        resp = await client.get(f"{REDASH_BASE_URL}/api/queries/{query_id}/results.json", headers=headers)
        resp.raise_for_status()
        data = resp.json()
    try:
        return data["query_result"]["data"]["rows"]
    except (KeyError, TypeError) as exc:
        raise RedashError(f"Unexpected response shape from query {query_id}") from exc
