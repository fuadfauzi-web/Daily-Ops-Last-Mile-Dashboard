"""Action Board counts that come from what people have ANSWERED in the app (2026-10-08), not from Redash:

  missing_to_answer  open Active Missing parcels (no Ship Out, no B2B documents -- the same list as Recovery -> Active Missing) that nobody has answered yet:
                     no row in active_missing_updates, or a row with none of the five questions answered.
  lost_to_answer     Lost Declared This Week parcels at a Last Mile station that nobody has answered yet: neither "customer received" nor "liable party" set.
                     A parcel the app already marks Recovered (its current status is anything but Cancelled) needs no answer and is not counted.

Counted at the station that owns the parcel; the tracking numbers go into the same drilldown cache as the other Shipper Watch metrics. Read-only: it only
reads the Recovery tables, so a problem here leaves the counts at 0 for one refresh and never fails it.
"""
import logging

import db
import kpi_data as kd
from stations import HUBS

log = logging.getLogger("board_counts")

_AM_ANSWERS = ("ticket_updated", "parcel_found", "contacted_customer", "customer_received", "liable_party")


async def apply_answer_counts(by_station: dict[str, dict], tn_details: dict[str, dict], missing_tn_rows: list[dict]) -> None:
    try:
        rows = await db.fetch_all(f"SELECT tracking_number, {', '.join(_AM_ANSWERS)} FROM active_missing_updates")
        answered = {r[0] for r in rows if any(v for v in r[1:])}
    except Exception as e:  # noqa: BLE001
        log.warning("active_missing_updates could not be read (%s) -- missing_to_answer stays 0", e)
        answered = None
    if answered is not None:
        for r in missing_tn_rows:
            if r.get("type") == "Ship Out" or r.get("is_b2b"):
                continue
            hub = r.get("station_code")
            tn = r.get("tracking_number")
            if hub not in by_station or not tn or tn in answered:
                continue
            by_station[hub]["missing_to_answer"] += 1
            tn_details[hub]["missing_to_answer"].append(tn)

    try:
        rows = await db.fetch_all("SELECT tracking_number, hub_code, customer_received, liable_party FROM lost_declared WHERE status = 'week'")
        got = await kd.load_compact("lost_current_status")
        status_map = got[1]["map"] if got else {}
    except Exception as e:  # noqa: BLE001
        log.warning("lost_declared could not be read (%s) -- lost_to_answer stays 0", e)
        return
    for tn, hub, received, liable in rows:
        if hub not in HUBS or hub not in by_station or received or liable:
            continue
        current = (status_map.get(tn) or "").strip().lower()
        if current and not current.startswith("cancel"):
            continue  # Recovered -- set by the app, nothing to answer
        by_station[hub]["lost_to_answer"] += 1
        tn_details[hub]["lost_to_answer"].append(tn)
