"""Weekly / monthly / daily periods of the KPI pages (Fleet Manager, 2026-09-26).

A week runs Monday to Sunday and is numbered like Excel's WEEKNUM(date, 2): week 1 is the week that holds 1 January, so 14-20 Sep 2026 is week 38 -- the
week the pages open on until the following Sunday is over. A week that crosses New Year is numbered by its Sunday (28 Dec 2026 - 3 Jan 2027 is week 1).

A page hands its uploaded days to `options(days)` and gets the periods it can offer for each view:
  weekly   the complete Monday-Sunday weeks, plus the week in progress ("so far"); a week that starts before the data does is left out
  monthly  the same for calendar months
  daily    the calendar months, the current one first: the page shows one station-by-day grid per month (a month that starts before the data is still offered)
Each option carries its own range and the range it is compared with (the period before -- for one in progress, the same number of days of the one before).
"""
from __future__ import annotations

import calendar
from datetime import date, timedelta

VIEWS = ("weekly", "monthly", "daily")
MAX_RANGE_DAYS = 400  # a from..to given by hand is cut to this many days
_MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
_MONTH = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def weeknum2(d: date) -> int:
    """Excel's WEEKNUM(d, 2): weeks start on Monday, week 1 holds 1 January."""
    jan1 = date(d.year, 1, 1)
    return ((d - jan1).days + jan1.weekday()) // 7 + 1


def week_number(monday: date) -> int:
    """The number of the Monday-Sunday week that starts on `monday` (its Sunday's WEEKNUM, so a week across New Year has one number)."""
    return weeknum2(monday + timedelta(days=6))


def monday_of(day: str) -> str | None:
    try:
        d = date.fromisoformat(day[:10])
    except (TypeError, ValueError):
        return None
    return (d - timedelta(days=d.weekday())).isoformat()


def week_key(day: str) -> str | None:
    """The bucket a day belongs to in a weekly trend: its Monday."""
    return monday_of(day)


def week_short(monday: str) -> str:
    return f"W{week_number(date.fromisoformat(monday))}"


def _span(a: date, b: date, year: bool) -> str:
    if a.month == b.month and a.year == b.year:
        s = f"{a.day}–{b.day} {_MON[a.month - 1]}"
    else:
        s = f"{a.day} {_MON[a.month - 1]} – {b.day} {_MON[b.month - 1]}"
    return f"{s} {b.year}" if year else s


def week_name(monday: str, year: bool = False) -> str:
    a = date.fromisoformat(monday)
    return f"Week {week_number(a)} · {_span(a, a + timedelta(days=6), year)}"


def month_short(month: str) -> str:
    return _MON[int(month[5:7]) - 1]


def month_name(month: str, year: bool = True) -> str:
    return f"{_MONTH[int(month[5:7]) - 1]}{' ' + month[:4] if year else ''}"


def _month_end(y: int, m: int) -> date:
    return date(y, m, calendar.monthrange(y, m)[1])


def _add_month(y: int, m: int, n: int) -> tuple[int, int]:
    i = y * 12 + (m - 1) + n
    return i // 12, i % 12 + 1


def options(days: list[str]) -> dict[str, list[dict]]:
    """{view: [option, ...]} newest first; option = {key, label, from, to, prev_from, prev_to, complete, default}. Empty lists when there are no days."""
    out: dict[str, list[dict]] = {v: [] for v in VIEWS}
    if not days:
        return out
    first, last = date.fromisoformat(days[0]), date.fromisoformat(days[-1])
    multi_year = first.year != last.year

    # ---- weeks
    weeks = []
    mon = last - timedelta(days=last.weekday())
    first_mon = first - timedelta(days=first.weekday())
    while mon >= first_mon:
        sun = mon + timedelta(days=6)
        to = min(sun, last)
        weeks.append({
            "key": mon.isoformat(), "label": week_name(mon.isoformat(), multi_year) + ("" if sun <= last else " (so far)"), "from": mon.isoformat(), "to": to.isoformat(),
            "prev_from": (mon - timedelta(days=7)).isoformat(), "prev_to": (mon - timedelta(days=7) + (to - mon)).isoformat(), "complete": sun <= last, "_start": mon < first,
        })
        mon -= timedelta(days=7)
    out["weekly"] = _finish([w for w in weeks if not w["_start"]] or weeks)

    # ---- months
    months = []
    y, m = last.year, last.month
    while (y, m) >= (first.year, first.month):
        start, end = date(y, m, 1), _month_end(y, m)
        to = min(end, last)
        py, pm = _add_month(y, m, -1)
        pstart, pend = date(py, pm, 1), _month_end(py, pm)
        pto = pend if end <= last else date(py, pm, min(to.day, pend.day))  # in progress: the same days of the month before
        months.append({
            "key": f"{y}-{m:02d}", "label": month_name(f"{y}-{m:02d}") + ("" if end <= last else " (so far)"), "from": start.isoformat(), "to": to.isoformat(),
            "prev_from": pstart.isoformat(), "prev_to": pto.isoformat(), "complete": end <= last, "_start": start < first,
        })
        y, m = _add_month(y, m, -1)
    daily = [
        {**x, "label": month_name(x["key"]) + ("" if x["complete"] else " (so far)") + (f" · from {first.day} {_MON[first.month - 1]}" if x["_start"] else "")}
        for x in months
    ]
    out["daily"] = _finish(daily, prefer_incomplete=True)
    out["monthly"] = _finish([x for x in months if not x["_start"]] or months)
    return out


def _finish(opts: list[dict], prefer_incomplete: bool = False) -> list[dict]:
    """Marks the option the page opens on: the newest complete one (the newest one at all for the daily view, where the current month is what is wanted)."""
    pick = opts[0] if (prefer_incomplete or not opts) else next((o for o in opts if o["complete"]), opts[0])
    for o in opts:
        o.pop("_start", None)
        o["default"] = o is pick
    return opts


def trend_labels(grain: str, keys: list[str], days: list[str]) -> tuple[list[str], list[str]]:
    """(short labels for the chart's axis, longer names for the table) of the buckets of a trend: days, weeks (keyed by their Monday) or months (YYYY-MM).
    A bucket that starts before the data does is marked partial, one that is not over yet "so far"."""
    first, last = (days[0], days[-1]) if days else ("", "")
    multi_year = first[:4] != last[:4]
    short: list[str] = []
    names: list[str] = []
    for k in keys:
        if grain == "week":
            sun = (date.fromisoformat(k) + timedelta(days=6)).isoformat()
            note = " (partial)" if k < first else " (so far)" if sun > last else ""
            short.append(week_short(k))
            names.append(week_name(k, multi_year) + note)
        elif grain == "month":
            end = _month_end(int(k[:4]), int(k[5:7])).isoformat()
            note = " (partial)" if k + "-01" < first else " (so far)" if end > last else ""
            short.append(month_short(k) + (f" {k[2:4]}" if multi_year else ""))
            names.append(month_name(k) + note)
        else:
            short.append(f"{int(k[8:10])}/{int(k[5:7])}")
            names.append(k)
    return short, names


def _iso(text: str | None) -> str | None:
    try:
        return date.fromisoformat(text[:10]).isoformat() if text else None
    except ValueError:
        return None


def resolve(days: list[str], view: str | None, period: str | None, frm: str | None, to: str | None, pfrom: str | None, pto: str | None) -> dict:
    """The range a request asks for: an explicit from..to (against prev_from..prev_to, or the same number of days before it), else the picked period of `view`
    (default weekly), else the default period of that view. {view, period, from, to, prev_from, prev_to}"""
    view = view if view in VIEWS else "weekly"
    f, t = _iso(frm), _iso(to)
    if f and t:
        if f > t:
            f, t = t, f
        n = min((date.fromisoformat(t) - date.fromisoformat(f)).days + 1, MAX_RANGE_DAYS)
        t = (date.fromisoformat(f) + timedelta(days=n - 1)).isoformat()
        pf, pt = _iso(pfrom), _iso(pto)
        if not (pf and pt) or pf > pt:
            pf = (date.fromisoformat(f) - timedelta(days=n)).isoformat()
            pt = (date.fromisoformat(f) - timedelta(days=1)).isoformat()
        return {"view": view, "period": None, "from": f, "to": t, "prev_from": pf, "prev_to": pt}
    opts = options(days)[view]
    if not opts:
        return {"view": view, "period": None, "from": "", "to": "", "prev_from": "", "prev_to": ""}
    o = next((x for x in opts if x["key"] == period), None) or next(x for x in opts if x["default"])
    return {"view": view, "period": o["key"], "from": o["from"], "to": o["to"], "prev_from": o["prev_from"], "prev_to": o["prev_to"]}
