import { useEffect, useMemo, useState } from "react";
import { api } from "./api";
import { FEATURES as F } from "./lib/features";
import { weeklyChanges } from "./lib/changelog";
import SegmentedControl from "./components/SegmentedControl";
import BellBadge from "./components/BellBadge";
import { entryId, markWhatsNewRead, unreadEntries, useWhatsNewUnread } from "./lib/whatsNew";
import { rankOf } from "./lib/roles";

// In-app onboarding reference (Help -> Guide, open to everyone; Help -> What's new is the same component with only="new").
//
// RULES FOR MAINTAINERS (2026-09-25 feedback):
//  * Keep this up to date whenever a build changes something a user can see -- new tab,
//    renamed column, changed behaviour. The Guide is part of the change.
//  * It only describes what the CURRENT build ships (lib/features.js flags), and only
//    what the signed-in user's role and scope can actually see: a station user is never
//    told about Region staff, Manager or Admin tools. Gate a section / FAQ / sentence
//    with ctx.rank (0 station, 1 region, 2 HQ staff / manager, 3 admin; see lib/roles.js) or ctx.wide (scope covers
//    more than one station).

function Bullets({ items }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
      {items.filter(Boolean).map((it, i) => (
        <li key={i}>{it}</li>
      ))}
    </ul>
  );
}

const SECTIONS = [
  {
    id: "roles",
    title: "Roles & what you see",
    body: ({ rank }) => {
      const rows = [
        { role: "Station staff: Station Head (SH), Fleet Assistant (FA)", rank: 0, text: "View the dashboard for their own scope only, plus Help (Feedback, Guide and What's new)." },
        { role: "Region staff: Region Head (RH), Regional Fleet Supervisor (RFS)", rank: 1, text: "View the dashboard for their zone(s) or region(s), plus add, edit and remove Station-staff teammates (SH / FA, with more than one station if needed) in Settings → Users." },
        { role: "HQ staff: HOD, Manager", rank: 2, text: "All of the above, plus add and manage Region and Station staff, and edit SLA Targets and Recovery Settings. A Manager can have a dedicated region (it places them in the org chart and the PIC list) and HOD has none, but both see every region's data and can manage Region staff, Station staff and other HQ staff in every region (not the HOD, which only the HOD and the Superadmin can)." },
        { role: "HQ staff: Fleet Admin, OPEX, Recovery, Restock", rank: 2, text: "See every region and station like a manager does, but are not managers: no user management and no SLA / Recovery settings. Each will get its own tabs for its own work." },
        { role: "Superadmin", rank: 3, text: `Everything: full user management, all Settings screens, the Superadmin page (Documents, Station List, KPI Settings, Data Refresh), replying to feedback${F.roleTester ? " and the Role Tester" : ""}.` },
      ].filter((r) => r.rank <= rank);
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Two independent things control what you can do and see: your <strong>role</strong> (what actions you're
            allowed) and your <strong>scope</strong> (which stations' data you see). {rank >= 1 ? "An admin or manager sets both when adding someone on the Users page (System)." : "Your admin sets both."}
          </p>
          <table className="w-full text-left text-xs">
            <thead className="text-slate-400">
              <tr>
                <th className="py-1 pr-3">{rank === 0 ? "Your role" : "Roles you can see"}</th>
                <th className="py-1">Can do</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.role}>
                  <td className="py-1 pr-3 font-medium">{r.role}</td>
                  <td className="py-1">{r.text}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            <strong>Scope</strong> (Station / Zone / Region / Everything) narrows every table, every filter list and every
            tracking-number list on every tab to just that slice of the network, automatically -- you never see anything
            outside the scope you've been given, not even as a filter option.
          </p>
        </div>
      );
    },
  },
  {
    id: "header",
    title: "Header & general controls",
    body: ({ wide, rank }) => (
      <Bullets
        items={[
          <>
            <strong>Data as of X</strong> (top right) is when the numbers were last pulled from Redash -- the whole app
            refreshes together every 15 minutes, so this one timestamp covers everything except Urgent TN's own list and
            Pending in Yesterday Route (captured once a day at ~12:30am).
          </>,
          <>
            <strong>Compact / Comfortable</strong> toggles row height -- a personal preference, it doesn't change any data.
          </>,
          wide && (
            <>
              <strong>Region / Zone / Station filters + search</strong> apply to most tabs at once. They only list the
              regions, zones and stations inside your scope.
            </>
          ),
          wide && rank >= 2 && (
            <>
              <strong>Include East Malaysia</strong> switches East Malaysia (Retail, not Last Mile) back on where your scope allows it.
            </>
          ),
          <>
            Clicking a <strong>clickable number</strong> (usually coloured) opens the tracking numbers behind it, with
            Export CSV and Copy list. Clicking a <strong>row</strong> opens a slide-over with every column for that row.
          </>,
          <>Every table has an <strong>Export CSV</strong> button that exports exactly what's filtered and sorted on screen.</>,
          <>
            A small <strong>i</strong> next to a column header opens a note explaining exactly how that number is worked out
            and what to do about it.
          </>,
          <>
            The <strong>{F.taskList ? "Task List" : "Urgent TN"}</strong> tab shows a red bell with a number when something needs your attention, and{" "}
            <strong>Help</strong> shows a bell badge for a reply to your feedback or an update you haven't read in{" "}
            <strong>Help → What's new</strong>; it clears once you've read it.
          </>,
          rank >= 3 && F.roleTester && (
            <>
              The <strong>Role Tester</strong> button (admin only) previews the app as another role and scope
              {F.roleTesterUser ? ", or acts as one specific user so you can test things tied to a person" : ""}.
            </>
          ),
        ]}
      />
    ),
  },
  {
    id: "action",
    title: "Action Board",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The "what do I act on today" tab. Pick the metrics you care about from the searchable picker at the top -- it
          draws from Station Health plus a few extras (Old Route's stuck count, Zalora NXD 0 Attempt/OVFD, Fresh Unscan and
          Route Monitoring's Current OVFD), plus <strong>Shipper SLA Warning / Breach</strong>: Amway, Watson, Orca and Cold Chain
          parcels at the station or still on their way to it -- older than 0 days is a warning, older than 1 day is a breach.
        </p>
        <p>
          Every heatmap column has a small <strong>i</strong>: click it for what the metric counts, <strong>which parcels or shippers it covers</strong> (for
          example Shipper SLA is only Amway, Watson, Orca and Cold Chain -- also written under the column name), the direction and target, and what to do about it.
        </p>
        <p>
          The heatmap groups by Region / Zone / Station and colours each cell by whether it breaches the Warning / Critical
          target set in SLA Targets; every column sorts, and "Breaches only" is on by default. "Act on these today" lists the
          worst stations first, each with <strong>Copy TNs</strong> and <strong>Export CSV</strong> grouped by which metric
          flagged them. With more than one metric picked, <strong>drag the metric chips</strong> next to the picker (or use their ‹ › arrows) to arrange the
          heatmap's columns -- the order is remembered.
        </p>
      </div>
    ),
  },
  {
    id: "shipment",
    title: "Shipment Details",
    body: () => (
      <Bullets
        items={[
          <><strong>Total Fresh</strong>: Fresh Unscan + the four Within ... buckets below, always (they're the same parcels, just split by whether they've been scanned in yet and how long it took). <strong>Total Shipment</strong>: today's shipment count for the hub.</>,
          <><strong>Fresh Unscan</strong>: parcels with no first scan-in at the station yet (blank 1st sweep). <strong>Latlong</strong>: parcels whose current destination differs from the intended one (RTS excluded).</>,
          <><strong>Fresh Attempt %</strong>: parcels with a first attempt ÷ Total Fresh, target ≥96%.</>,
          <><strong>LH Timing</strong>: each line-haul trip's arrival time and parcel count (e.g. "10:32am · 45"). Colour bands: green before 10am, blue 10–11am, amber 11am–12pm, red after 12pm.</>,
          <>
            <strong>Within 1h / 1-2h / 2-3h / 3h+</strong>: how long each parcel took from the shipment arriving at the
            station (column G) to its first scan-in there (column H).
            {F.bucketDetails ? " Each shows the count and its % of Total Fresh, sorts by that %, and opens its tracking numbers (with CSV) when clicked." : ""}
          </>,
          F.timingChart && (
            <>
              The <strong>timing chart</strong> under the table plots scan-in, first-attempt, success and LH Timing (line-haul trip arrivals) by hour of day. Hover an hour for its
              count and its <strong>% share</strong> of that line's total, or switch <strong>Count / % share</strong> above the chart to plot each line as a %
              of its own total.
              It follows the table's filters until you pick its own Region / Zone / Station filter, which then overrides them.
            </>
          ),
        ]}
      />
    ),
  },
  {
    id: "health",
    title: "Station Health",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The master per-station KPI table. Every column follows the same rule -- grouped by <em>where the parcel physically is</em> (last
          scan hub) -- except the missing and routed columns, whose header notes give their own logic.
        </p>
        <Bullets
          items={[
            <><strong>0 Attempt</strong> is age-0 only; <strong>0 Attempt &gt;D0</strong> is the same thing aged over 0 days -- they never overlap.</>,
            <><strong>Age &gt;3</strong> is parcels sitting in-hub more than 3 days, scored as a count or as a % of Total In Hub -- its header has a # / % toggle so you can sort by either.</>,
            <><strong>Missing (Hub / Driver-Rider / Ship-in)</strong>: open missing-parcel tickets split by who is on the hook. <strong>Pending ATS</strong> is parcels pending Add To Shipment.</>,
            <><strong>Routed %</strong>: Total Routed ÷ (Total Routed + Total In Hub).</>,
            <><strong>Attendance</strong>: unique Hybrid / Independent drivers with a route today. "12 (2 Rescue)" means 2 of the 12 are routing away from their home station, same as Route Monitoring.</>,
            F.stationHealthCombined ? (
              <>One expandable table that starts at your own scope: a nationwide view opens Region → Zone → Station, a station-scoped view is just your stations. Anyone who sees region / zone rows can hide them with the "Show region rows" / "Show zone rows" checkboxes beside Export CSV (both off = a flat list of stations). Cells are coloured only where an SLA target exists (set in SLA Targets). Use Export CSV for what's shown.</>
            ) : (
              <>Coloured cells (▲ critical / ■ warning) are metrics with an SLA target. Cells without a target are shaded on a relative scale instead -- a ranking, never a pass/fail judgement.</>
            ),
            <>Click any number for its tracking numbers; click a column header's <strong>i</strong> for what the number means and the action to take.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "processingTime",
    title: "Processing Time",
    show: () => F.processingTime,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p className="rounded-lg bg-amber-50 p-2 text-amber-900 ring-1 ring-amber-200">
          <strong>Beta, staging only for now.</strong> It covers the stages we already have live data for; Driver Inbound and the Hybrid / Independent
          driver split from the Metabase "Last Mile Processing Time" dashboard are not in it yet.
        </p>
        <p>
          The <strong>Processing Time</strong> tab (next to Shipment Details) shows the hour-of-day pattern of each stage at the station for the
          <em> past 7 days</em>, so you can see when work really lands and compare days. Pick a single day or <em>Last 7 days</em> (added up).
        </p>
        <Bullets
          items={[
            <><strong>Shipment Arrival</strong>: the hour each parcel's shipment completed at the station. <strong>Scan-in</strong>: 1st sweep at the station. <strong>1st attempt</strong> and <strong>Success</strong>: the first delivery attempt and the successful delivery. <strong>LH Timing</strong>: line-haul trip arrivals.</>,
            <>The chart has its own Region / Zone / Station filters and a Count / % share switch, same as the Shipment Details chart; click a legend item to hide a line. The table below gives each station's totals and busiest hour per stage.</>,
            <>It uses the same feeds as Shipment Details, but keeps one snapshot per station per day (the last refresh of the day is that day's number), so history builds up from when the tab went live. Today is still moving until the last refresh.</>,
            <>Later: a weekly trend and one month of history for the Management View.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "dailyKpi",
    title: "Daily KPI",
    show: () => F.dailyKpi,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p className="rounded-lg bg-amber-50 p-2 text-amber-900 ring-1 ring-amber-200">
          <strong>Not 100% accurate yet.</strong> The start-clock logic and targets are still being validated against the official KPI
          result -- treat it as a working estimate for today's action, not the official number. It's here because an imperfect picture of
          today beats no picture at all.
        </p>
        <p>
          The <strong>Daily KPI</strong> tab (next to Station Health) shows, for <em>today only</em>, how many of a station's fresh
          parcels still need to be attempted or delivered to hit its target. It needs no new data -- it's built from the same
          Shipment Tracker feed as Shipment Details, rebuilt every refresh, and resets at midnight.
        </p>
        <Bullets
          items={[
            <><strong>FIFO D0</strong>: met once the parcel gets any delivery attempt -- success or fail -- the same day it arrived (the "start clock" is the later of shipment completion and 1st sweep at the station, rolled to the next day if that moment is after noon). A next-day attempt, even a failed one, is a miss.</>,
            <><strong>Prior</strong>: met only on a successful delivery the same day, out of PRIOR-tagged parcels only (a subset of fresh) -- a station with no Prior-tagged parcels that day shows 0/0.</>,
            <><strong>Completion D0</strong>: met only on a successful delivery the same day, out of every fresh parcel.</>,
            <><strong>Left to attempt / deliver</strong> is against that station's own region target (Superadmin → KPI Targets), same targets the KPI page's FIFO D0 / Completion D0 / Prior RCA pages use.</>,
            <><strong>Not Yet</strong> shows how many of the still-outstanding parcels are sitting Arrived at Sorting Hub (AASH) vs On Vehicle for Delivery (OVFD) -- it doesn't have to add up to the full gap, since a parcel in any other status isn't broken out.</>,
            <>Latlong parcels are excluded from every count here, same rule as Shipment Details' own Latlong metric (RTS-tagged ones are kept in).</>,
            <>Switch between <strong>Station / Zone / Region</strong> with the control above the table; Export CSV downloads what's shown.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "kpi",
    title: "KPI",
    show: () => F.kpiDashboard,
    body: ({ rank }) => (
      <div className="space-y-2 text-sm text-slate-700">
        <p className="rounded-lg bg-amber-50 p-2 text-amber-900 ring-1 ring-amber-200">
          <strong>Beta -- preview only.</strong> The KPI page is not in use yet: its data is not up to date and it is here to show how it will look. Please wait for the green light
          before you use it or rely on a number in it.
        </p>
        <p>
          The <strong>KPI</strong> page (next to Dashboard in the header) is the <strong>RCA side of the KPIs</strong>: the OPEX team's dashboard shows the result (a %),
          this page shows <em>why</em> -- by hub, reason, driver and shipper, with the tracking numbers behind every number. The menu on the left has two parts.
        </p>
        <Bullets
          items={[
            <><strong>Dashboard</strong> -- <strong>Trend</strong> (Daily / Weekly / Monthly; only Weekly for now -- the team's WoW dashboard): pick a region, zone or station and see every KPI (Success Rate, D-0, FIFO D0, D-3, T-7, COD RTS, Sweep, Prior, Invalid POD, Complaint, Lost, Shipment Inbound, RPU) for the past 4 weeks against its target (green on target, red ▲ missing), a trend line per KPI, and the stations underneath for the chosen week. <strong>OPEX</strong> (first in the menu) shows the OPEX dashboard's result: every hub (or area / region) with each KPI's rate against its target, green when met and red when missed, and how many KPIs it missed; admins load it from the OPEX dashboard's <em>Download CSV</em>. It gets merged into the Trend later. <strong>Access</strong>: OPEX is open to everyone in full; Trend and every RCA analysis page follow your own region / zone / station. <strong>East Malaysia</strong> (Retail, not Last Mile) is left out of every KPI page unless an admin includes it under Superadmin → KPI Settings; <strong>Sarawak</strong> (East Malaysia 3 and 4) stays out for now even then.</>,
            <><strong>RCA analysis</strong> -- in this order: Hybrid, Prior, FIFO D0, Completion D0, Completion D3, Terminal T7, COD RTS, Lost, Invalid POD and Complaint (Lost and Complaint are marked <em>soon</em> and will share their logic later). <strong>Hybrid Productivity</strong> (sub-tabs: <em>Driver Performance</em>, <em>Station Performance</em>, <em>Zone Breakdown</em> for region staff and above, <em>Regional Breakdown</em> for managers and admins, and <em>Daily Data (Current Month)</em>; every table has a <em>vs last week / month</em> column showing whether productivity rose or dropped, and two ticks above the tables show only the increasing or only the dropping rows; attendance below the target -- 6 days a week, 26 a month -- is red; the low performers are the drivers under their region's productivity target (set under Superadmin → KPI Settings; 80 until a region has one); <em>Daily Data (Current Month)</em> always adds up the current month, whatever View and Period say, and The driver tables also show <em>Sizing (S/M/L)</em> -- the share of delivered parcels in each size, S = XS+S, M = M, L = L+XL+XXL -- and two more productivity figures next to the usual one: <em>Productivity (Delivered)</em> counts only delivered parcels, <em>Productivity (D+P+RSVN)</em> also counts reservation pickups; all three divide by the same corrected Attendance (days actually worked, not routes run -- a driver with two routes the same day now counts as one day, not two). Tenure (Service Duration) comes from the same file. A file in the older layout still loads, but shows "—" for Sizing and 0 for the two extra productivity figures until the all-in-one file is uploaded), <strong>Invalid POD</strong> (sub-tabs: <em>Overview</em> -- invalid % by station against the 25% target, the reasons behind it, the drivers with the most, the tracking numbers; <em>Drivers &amp; reasons</em> -- every driver with invalid POD and their top invalid reason, and the day-by-day trend of a picked driver; <em>Date trend</em> -- invalid % / count per day, week or month for a region, zone, station or driver; <em>Reasons</em> -- each reason and which stations it comes from; and, for managers and admins only, <em>LM performance</em> -- the weekly LM POD Performance view: zones, stations, drivers and OPS routes on the final result after the audit) and <strong>COD RTS</strong> (COD parcels returned to the shipper; sub-tabs: <em>Overview</em>, <em>Reasons</em>, <em>Shippers</em> with the cumulative share and the parent-shipper roll-up, <em>Drivers</em> with their top reason, <em>Timing &amp; attempts</em>, <em>Parcels</em> by size / driver type / status / FIFO, <em>Date trend</em>, and the <em>Tracking numbers</em>). In these tables a column that shows a count with a % sorts by the %. <strong>Prior KPI</strong>, <strong>FIFO D0</strong>, <strong>Terminal T7</strong> and <strong>Completion D0 / D3</strong> each have an <em>Overview</em> (the period picked: the % met against the target, the change on the period before, the regions / zones / stations under target -- worst first, with an <em>Under target only</em> tick -- and the official OPEX number beside it), <em>Day by day</em> (the station-by-day grid of the period: the % met of every station on every day, green on target and red under it, Sundays shaded, the period's total on the right; click a header to sort) and a <em>Trend</em> (% met per day, week or month for regions, zones and stations, by start-clock date -- Terminal T7 by its N7 cut-off date, so a T7 week is final once it is over -- with the target line; Prior measures each TN against its working start-clock date -- the clock pauses and restarts around PETs -- but reports the result and the trend by start-clock date). <strong>Weekly / Monthly / Daily</strong>: like Hybrid Productivity, Prior, FIFO D0, Terminal T7, Completion D0 / D3, COD RTS and Invalid POD have a <em>View</em> and a <em>Period</em>. A week runs Monday to Sunday and is numbered like the team's sheets (week 38 = 14-20 Sep 2026); the page opens on the last complete week, <em>Monthly</em> on the last complete month and <em>Daily</em> on the current month, day by day -- any earlier week or month is one pick away, and the week or month still in progress is there too, marked <em>so far</em>. The View also sets the trend's grain (Day shows the days of the period picked; Week and Month run over everything in the file). The Prior, FIFO, Completion and Terminal files hold 26 weeks; COD RTS and Invalid POD offer the weeks and months inside the file that was uploaded (a file that holds a whole month gives the month). The numbers to quote are the <strong>OPEX result</strong>; these pages show where a KPI is slipping, and their exclusions are provisional until confirmed with OPEX. Only stations count: hubs in the file that are not on the station list (return hubs, cross-dock, cold-chain, PUDO ...) are left out, and managers and admins are told how many hubs and TNs under the numbers. <strong>Targets are per region</strong> (Klang Valley, Northern, Southern, East Coast, East Malaysia; an admin sets them under <em>Superadmin → KPI Targets</em>): every station, zone and region is judged against its own region's target, and the Weekly Dashboard, Invalid POD and COD RTS do the same. A total that spans regions is judged against the blend of their targets and says so.</>,
            <>Click a station, reason or driver to filter the rest of the page; <strong>Show tracking numbers</strong> lists them and <strong>Export CSV</strong> downloads them all.</>,
            rank >= 3 ? (
              <><strong>Data upload</strong> (admins only -- nobody else sees the upload cards or the Metabase links): each page has a Data upload button. Prior, Completion D0 / D3, Terminal T7 and FIFO D0 each load from a small Metabase file of the last 26 weeks, station by day (Prior 127199, Completion 127200, Terminal 127201, FIFO D0 127205). COD RTS and Invalid POD read the weeks inside the file -- for a monthly view download a date range that covers the month. Every slot has an <em>Open in Metabase</em> link (or, for the OPEX result, a link to the OPEX dashboard): click it, download the results as CSV, then choose the file -- CSV or Excel; for a workbook the right sheet is picked for you -- and it is loaded straight away. One current file per slot; uploading again replaces it. <strong>Several files at once</strong>: the Data upload box at the top takes any number of downloaded CSVs in one go (drag them in, or click and pick several) and matches each to its slot by its columns -- Prior and FIFO D0 have identical columns, so those two are told apart by the file name Metabase gives the download (it contains &quot;Prior&quot; / &quot;FIFO&quot;); a file it can't place is listed with the reason and the others still load. The box also links to <strong>one Metabase page that holds every feeder</strong>, so you open one link instead of one per file. Hybrid Productivity is three files (weekly, monthly, daily), each all-in-one. For Hybrid Productivity an uploaded file is used instead of Metabase until you remove it.</>
            ) : null,
            rank >= 3 && (
              <>Hybrid Productivity can also read Metabase directly. If it shows a 401 error, open that page's <strong>Check Metabase connection</strong> for a plain-English reason. The app reads three all-in-one <em>All Regions</em> Metabase questions (weekly, monthly, daily -- no Southern filter), so it covers every station once the connection works.</>
            ),
            <>A driver's station comes from the station code in their name (for example "LKN - HD - ...").</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "dod",
    title: "DoD",
    show: () => F.dod,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The <strong>DoD</strong> tab (<em>Beta</em> -- still being built; after Shipper Radar; everyone can open it, limited to their own region / zone / station) is the dashboard looking back: one snapshot per station per day --
          the last refresh of the day, the run just before midnight -- kept for this week and last week only. It follows your scope and the filters above the tabs.
          History starts from the first refresh after it went live, so the first days have only a few dots, and today's numbers are still moving.
        </p>
        <Bullets
          items={[
            <><strong>Daily View</strong>: pick a day and see every region / zone / station with <em>Shipment Details</em> (Total Fresh, Fresh Unscan, Latlong, LH Timing), <em>Station Health</em> (Total 0 Attempt, In Hub, Age &gt;3) and <em>Route Monitoring</em> (Attendance with rescue in brackets, Total Routed, Success Rate, and Pending in Apps -- the Current OVFD, parcels still on a vehicle). The small ▲ / ▼ is the change from the day before, green when it is an improvement. Export CSV gives the day.</>,
            <><strong>LH Timing</strong> (2026-09-28): the day's captured line-haul trip(s), same colours as Shipment Details -- green before 10am, blue 10–11am, amber 11am–12pm, red after 12pm. At station level it's that station's own trip(s); at region / zone level each trip slot (1st, 2nd) shows the latest -- worst -- arrival among the stations in view, with parcels summed across them.</>,
            <><strong>Weekly Overview</strong>: pick <strong>one or more measures</strong> and see them across Mon–Sun -- this week, last week, or both. With several measures the chart draws them all (each on its own scale; hover a day for the real numbers), and the details table below shows <strong>one measure at a time</strong> -- switch it with the <em>Details table for</em> buttons. Click a row of the table to draw that row.</>,
            <>Success Rate = Total Success ÷ Total Routed; Productivity (in the measure list) = Total Routed ÷ Attendance.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "attendance",
    title: "Attendance",
    show: () => F.attendance,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p className="rounded-lg bg-amber-50 p-2 text-amber-900 ring-1 ring-amber-200">
          <strong>Beta, staging only for now.</strong> PTWH (part-time warehouse) is built first; <em>Staff</em> and <em>Hybrid</em> attendance will follow in the same tab.
        </p>
        <p>
          The <strong>Attendance</strong> tab replaces the PTWH ATTENDANCE Google Sheet. Instead of typing one amount per person per day, you record a
          <em> clock in</em> and <em>clock out</em> time and the pay is worked out from the hours. You only see the stations in your scope; station and region
          staff and managers can record, other HQ roles can view.
        </p>
        <Bullets
          items={[
            <><strong>Today</strong> -- every active PTWH at your station(s): pick the category (it remembers their last one) and press <em>Clock in</em> when they arrive and <em>Clock out</em> when they leave. <em>Correct</em> asks to fix a time (see <em>Corrections</em> below) -- nobody edits or deletes a clock record directly.</>,
            <><strong>Month sheet</strong> -- the old sheet's grid: a row per PTWH, a column per day showing hours worked, then workdays and payable. Green = full day, blue = half day, amber … = clocked in but never clocked out (fix it by clicking the day). Filter by Region / Zone / Station, then <em>Export CSV for HR</em> (or <em>Copy for HR sheet</em>) gives the HR sheet's layout -- month, station, name, IC, justification (the first category of the month: C1/C2 Insufficient Manpower, C3 Cover Staff AL/OFF, C4 High Volume) and the RM for each day. Region staff and Managers only; a day on hold or still open is left blank.</>,
            <><strong>Workers</strong> -- the PTWH roster: name, station, IC, phone, default category, daily rate (RM50 by default) and joined date. <em>Import existing PTWH</em> (Managers only) loads the PTWH DETAILS tab (downloaded as CSV) in one go -- it only adds people who are not in the list yet and never overwrites, so station edits survive a re-import; they are existing PTWH, so they start approved. Put an <em>End date</em> when someone stops -- from that day they are inactive and can't log in; their history stays. A PTWH with no clock in or out for 1 month goes inactive by itself, and an inactive PTWH is cleaned up after 2 months (IC, phone, selfies and login removed; name and pay history kept). <em>Re-hire</em> brings someone back, at the same or another station, with the same Region Head then Manager approval; the same IC can't be added twice.</>,
            <><strong>Categories</strong> -- every day carries one of the 4 standard PTWH categories: <strong>C1</strong> Core Shift (inbound &amp; push-off), <strong>C2</strong> Vacancy Cover (short of staff), <strong>C3</strong> Leave &amp; Rotation Cover, <strong>C4</strong> Volume Surge / PM Support. They replace the old free-text justification. The Month sheet adds up days and payable by category and flags anyone over a category's max days (C1 and C2 26, C3 20).</>,
            <><strong>New PTWH hires</strong> -- <em>Add PTWH</em> sends a new hire for approval: first the <strong>Region Head</strong>, then a <strong>Manager / HOD</strong>. Until both have approved they are not active (no clocking, no schedule, no app login). Approvers see a banner and a count on the Attendance tab, and Approve / Reject buttons in Workers. The existing PTWH list is loaded once by a Manager with <em>Import existing PTWH</em> (those people are already approved).</>,
            <><strong>PTWH app link</strong> -- shown at the top of the PTWH tab with a <em>Copy</em> button. Give it to a PTWH who has lost it; they log in with the username you created for them.</>,
            <><strong>Pay on hold</strong> -- the pay for a day clocked by the emergency QR code, or one an auditor flagged, is <strong>on hold</strong> (shown amber, and separate from Payable) until an auditor marks it <em>Checked OK</em>. Station Heads, Region Heads and Managers see a banner and a count on the Attendance tab while any are waiting.</>,
            <><strong>How pay works</strong> -- 6 hours or more is a full day at their daily rate; less than 6 hours is a half day; a day with no clock-out pays nothing until it is closed.</>,
          ]}
        />
        <p>
          <strong>Staff attendance</strong> -- Station Heads and Fleet Assistants clock in and out in the <em>Staff</em> tab, signed in with their Ninja Van Google account (no separate login, no selfie).
          Open the dashboard on your phone, go to <em>Attendance → Staff → My clock</em> and press <em>Clock in</em> when you arrive and <em>Clock out</em> when you leave. You must be within
          <strong>100 m</strong> of your station (its latitude / longitude in Fleet Admin → Premises); your phone's location is checked at that moment. <em>Today</em> shows everyone in your scope with their scheduled shift,
          and <em>Month sheet</em> shows hours per day, days worked and days still open. Location not working? Tell your Region Head -- a <strong>Region Head, RFS, HOD or Manager</strong> can <em>Fix time</em>
          (a reason is needed, a shift is 12 hours at most, the original times are kept, and nobody fixes their own). A QR code issued by the Region Head, and Hybrid drivers (who will use their driver app login), come later.
        </p>
        <p>
          <strong>Schedule</strong> -- the <em>Schedule</em> tab is where a station keys in who works which shift, week by week, for <strong>PTWH, Staff and Hybrid drivers</strong> in one place (pick the group above the grid; <em>Copy last week</em> saves retyping). Only <strong>Station Heads, Region Heads and Managers</strong> can change it; everyone else with the station in their scope can read it. PTWH come from the PTWH list, Staff from the Staff &amp; Org Chart; Hybrid drivers are typed in for now and will come from a Fleet Admin driver list once that tab is built. The shifts are <strong>AM, Middle and PM</strong> (plus Half day for PTWH, and Off / Leave) -- every station writes down its <em>own</em> AM / Middle / PM hours in the <em>Shift times</em> box above the grid (Station Heads, Region Heads and Managers can set them), because an AM can start at 5am in one station and 8am in another; those hours show beside the shift for that station's PTWH and Staff. Each PTWH sees their own next two weeks in the PTWH app.
        </p>
        <p>
          <strong>PTWH app</strong> -- PTWH clock themselves in and out in a separate small app on their own phone (not this dashboard), with their own login.
          They must <em>prove they are at the station</em> and take a selfie with the station behind them:
        </p>
        <Bullets
          items={[
            <><strong>Workers</strong> -- press <em>Create login</em> next to a PTWH: you give a username, we make a temporary password and a recovery code (shown once -- copy it for WhatsApp). The PTWH changes the password themselves in the app. Forgot it? They use the recovery code in the app, or you press <em>Reset password</em>.</>,
            <><strong>Station QR</strong> -- PTWH clock in by <strong>location</strong>: their phone must be within <strong>100 m</strong> of the station, using the station's latitude / longitude from Fleet Admin → Premises (the same 100 m for every station; station users can't change it, and a station with no latitude / longitude there can only use the QR). The QR code is an <strong>emergency fallback</strong> for a phone whose location doesn't work, and it is <strong>made on request</strong>: choose the PTWH on this page and press <em>Request QR code</em>. It works <strong>only for that person</strong>, <strong>once</strong>, for <strong>10 minutes</strong>; clocking out needs a new one, and a new request replaces the last. They must give a reason, and <strong>every QR clock goes to Audit as "needs review"</strong>.</>,
            <><strong>Corrections</strong> -- to fix a clock record press <em>Correct</em> on the day (Today or Month sheet) and give a reason. A change within <strong>30 minutes</strong> of the original is applied and logged. Anything bigger, a missing day, or a <em>void</em> (a record is never deleted; it stays in the history) waits in the <em>Corrections</em> view for a <strong>Region Head, RFS or Manager</strong> -- never the person who asked -- and that day's pay is on hold until then. A shift can be <strong>12 hours</strong> at most, and a day clocked in the app with a selfie can't have its clock-in changed.</>,
            <><strong>Audit</strong> -- every clock made in the app with how it was verified (QR, or location and how many metres from the station) and the selfie. Open the photo to check the face is clear and the station is visible behind the person. Station, RH, RFS, managers, HOD and Fleet Admin can all see the stations in their scope. A QR (emergency) clock shows <em>Needs review</em> with the reason the PTWH gave, and stays that way until someone marks it <em>Checked OK</em> or flags it. A day can be reviewed only after the PTWH has clocked in <em>and</em> out. Press <em>Review</em> to <strong>flag</strong> a clock-in as suspicious (with a note) or mark it <em>Checked OK</em>; use <em>Flagged only</em> / <em>Needs review</em> to find them. A normal clock's selfie is deleted after <strong>14 days</strong>. The evidence behind a QR clock is kept <strong>5 weeks</strong> and is cleared once a month, in <strong>week 2</strong> (the 8th-14th). A flagged one, or a QR one still waiting for review, is kept until it is cleared or marked OK.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "management",
    title: "Management View",
    show: ({ rank }) => F.managementView && rank >= 2,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The <strong>Management View</strong> tab (<em>Beta</em>, staging only for now; managers and admins only) is the nationwide, higher-level
          rollup -- for a Head of Department / Head of Operations / COO view, not the station-level detail the rest of the app is built for.
          It reads the numbers the app already captures (the daily Station Health / Route Monitoring / Shipment Details snapshot that DoD keeps,
          live Aging Details and Shipper Radar) and rolls them up nationwide.
        </p>
        <Bullets
          items={[
            <><strong>Operation Health</strong> -- pick a date (defaults to yesterday; history is the current and last week) and switch Daily / Weekly. Routing health: Total Routed, Total Delivered, Success rate, Routed % (Routed &divide; (Routed + In Hub)) and attendance split Total / Hybrid / Independent / Rescue, with a day-by-day or week-by-week trend (the Hybrid / Independent split is only recorded from 2 Oct, earlier days show a dash). Routed % bucket: stations banded below 50%, 50-60, 60-70, 70-80, 80-90 and 90%+, each compared with its 0 Attempt (Arrived at Sorting Hub, 0 attempts, last sweep hub = destination hub). Attendance vs volume: volume = Routed + parcels in hub that day; pick parcels per driver (40-80) to see the attendance needed, the attendance rate, and the stations by rate and biggest gaps. Rescue routes: rescue attendance and the top stations.</>,
            <><strong>Aging health</strong> (live, latest refresh) -- Aging delivery older than 3 days with the top 10 stations, Aging ATS older than 1 day with the top 3, Aging 0 Attempt older than D0 with the top 10, and the Control Tower Hypercare shippers (Watson, Orca, Zalora NXD, Cold Chain, from Shipper Radar) as a total plus the top 10 stations.</>,
            <><strong>Shipment compliance</strong> -- LH timing: stations by their latest line-haul arrival that day (after 12pm, 11am, 10am, 9am, 8am and below). Per bucket, the top 10 hubs by their late trip (each hub's latest arrival, with that trip's driver, parcels and the hub's day total; switch to latest-arrival-first). Driver data comes from Metabase question 127512 (completed land-haul trips, last 14 days) -- an admin opens the link shown on the page, downloads the CSV and uploads it there; without it the page falls back to Redash's station-level timing. Latlong: total and the top 10 hubs.</>,
            <><strong>Capacity</strong> -- Hub Size (sqft) per station from the admin-uploaded Fleet Management workbook (re-upload whenever a hub relocates), and Staff from the Staff &amp; Org Chart: the people posted at the station plus its TBA seats (the Headcount view there is where a Manager / HOD adds or removes them). PTWH is typed in per station by a manager (some stations run a fixed daily PTWH, others only for offdays or backlog). Parcel capacity follows the hub's sqft (1 parcel per sqft -- change the parcels-per-sqft figure, or type a capacity for one hub) and shows how full each hub is. Driver / rider attendance is shown weekday vs weekend, by date or by week, per region, zone or station.</>,
            <><strong>Backlog Radar</strong> -- the top 20 hubs by 0 Attempt or Age &gt;3, by number or by % of In Hub (severity blends Age &gt;3 %, On Hold and 0 Attempt %, fixed bands for now). Click a row to type in the backlog mitigation plan with a status, owner and target date, plus the rescue plan and its deployment cost; the Rescue plans table lists every hub that has one.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "staff",
    title: "Staff & Org Chart",
    show: ({ rank, me }) => rank >= 2 || me?.position === "fleet_admin",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The <strong>Staff &amp; Org Chart</strong> tab (staging only for now) is where the Fleet Admin team keeps the staff list right. It is the same list
          that gives people dashboard access and that the PIC box searches, so a change here shows up everywhere at once.
        </p>
        <Bullets
          items={[
            <><strong>Staff list</strong> -- everyone with a position, HQ staff included (HOD, Manager, Fleet Admin, OPEX, Recovery, Restock, Region Head, RFS, Station Head, Fleet Assistant), with where they are <em>posted</em>. <em>Add a person</em> (email, name, position, HQ / region / zone / station), <em>Edit</em> to move someone or change their position, <em>Remove</em> for a leaver (they lose access and drop off the PIC list). Search by name, email, mobile, employee ID, position, station or zone. Only the Fleet Admin team and the Superadmin can edit this list.</>,
            <><strong>Mobile and employee ID</strong> -- kept per person next to their position. Only HQ staff, Managers and the Superadmin can see them; the PIC box never shows them.</>,
            <><strong>Paste from sheet</strong> -- copy rows from the Fleet Management sheet (with the header row: Email, Name, Designation, Station / Zone / Region, Mobile, Employee ID) and paste them in. A preview shows each row as New, Update or Skipped with the reason (vacant seat, no email yet, station not recognised). Import adds the new people and, unless you untick the box, updates the ones already in the list; a TBA in the sheet never wipes a number that is already on file.</>,
            <><strong>Posting vs access</strong> -- the list is where people are posted; what each person can <em>see</em> (their access) starts out the same and moves with them. A Manager / HOD, Region Head / RFS or the Superadmin can widen someone's access in Settings -&gt; Users, for example when a person is sent to rescue another station or region; the list then shows <em>Custom</em> for that person and their posting changes no longer overwrite it. The Fleet Admin team does not edit access.</>,
            <><strong>Org chart</strong> -- HQ staff on top, then each region with its manager, each zone with its Region Head / RFS, and each station with its Station Head and Fleet Assistants. A seat a Manager / HOD has opened but nobody fills shows as a dashed <em>Vacant</em> chip; a station with no Station Head and no vacant seat shows <em>No Station Head</em> in red. Click a person to edit them.</>,
            <><strong>Headcount</strong> -- three tables: <em>Stations</em> (Station Head, Fleet Assistant), <em>Zones</em> (Region Head, Regional Fleet Supervisor) and <em>HQ</em> (Fleet Admin). A place's headcount is the people posted there plus its <em>vacant seats</em> (planned, or someone whose email isn't known yet); a Region Head / RFS who covers two zones is listed in both rows but counted once in the cards. The <em>Add headcount</em> form has one Role list (Station Head, Fleet Assistant, Region Head, RFS, Fleet Admin) and a Location picker (station(s), zone(s) or HQ): pick two zones, e.g. South 1 and South 2, for ONE seat that covers both. Management View → Capacity uses the station numbers. Click a column header to sort the table. <strong>Only a Manager, the HOD or the Superadmin adds or removes headcount</strong>: the HOD adds a seat straight away; a Manager's new seat waits for the HOD to approve it (Approve / Reject in the "Waiting for the HOD" box); a Manager or the HOD removes a seat with no approval. The Fleet Admin team cannot add or remove headcount, but fills a vacant seat with a person's details (<em>Add person</em> on its Vacant row in the Staff list) and edits current staff; when a person is removed their seat stays and becomes vacant.</>,
            <>Managers, HOD, other HQ staff and the Superadmin can open the tab and read it, but only the Fleet Admin team edits the staff list (names and details); only Managers / HOD / the Superadmin change the headcount seats.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "fleetadmin",
    title: "Fleet Admin: Premises, Vehicles, Assets",
    show: ({ rank }) => rank >= 2,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The <strong>Fleet Admin</strong> tab (staging only for now) holds the lists the Fleet Admin team used to keep in Google Sheets. <strong>Premises</strong> is
          first: one record per station with its address, size, launch date, business licence and tenancy dates, rent, deposit and document links. HQ staff and
          above can read it; only the Fleet Admin role can edit (for now, not even the Superadmin).
        </p>
        <Bullets
          items={[
            <><strong>Chips on top</strong> -- Licence expired, Licence within 90 days, Tenancy ended, Tenancy within 90 days, Dates missing. Click one to see just those stations. The days left are worked out from the dates, so there is no "Expires In" column to keep right.</>,
            <><strong>Edit</strong> a station to change any field (leave a field empty to clear it). Document links must start with http:// or https://; put one tenancy document link per line.</>,
            <><strong>Paste from sheet</strong> -- copy rows of the Fleet Management sheet's Address tab with the heading row and paste them in. A preview shows what will be saved and why a row is skipped (station not recognised, a date that can't be read). Only cells with something in them are saved: a blank, TBA or N/A never wipes what is already in the app.</>,
            <><strong>Vehicles</strong> -- every van and truck from the Master Vehicle Inventory: plate, station, type, owner, driver, the driver's GDL and licence expiry (with the days left), and the fuel and Touch 'n Go cards. Card numbers show only their last 4 digits until you tick <em>Show card numbers</em>. Chips for Licence / GDL expired or within 90 days and No driver; filter by region, state, status, function or owner. The Fleet Admin team adds, edits and removes vehicles, or pastes rows from the sheet's Master tab.</>,
            <><strong>Assets</strong> -- all asset lists in one tab, by category. <em>Station inventory</em> is first: for each station, every item it should have (laptops, scanners, cages, baskets, fans, fire extinguishers ...) with how many are good and how many damaged, grouped (IT &amp; devices, Handling, Furniture &amp; fittings, Cooling &amp; water, Safety &amp; health, Cash &amp; weighing). Open a station to change its counts, add an item, remove one, or paste its tab from the sheet; a station with no inventory yet starts from the standard list. <em>By item</em> adds each item up across the region / zone you pick. Fire extinguisher and weighing scale lists will come as more categories.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "routed",
    title: "Route Monitoring",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Switch between Region / Zone / Station / Driver{F.completionSummary ? " / Completion Summary" : ""} / Old Route / Pending in Yesterday Route with the level switcher.
        </p>
        <Bullets
          items={[
            <><strong>Productivity</strong>: Total Success ÷ Total Routed as a plain number; at driver level it's scored against a target per driver position.</>,
            <><strong>Completion Rate</strong>: (Total Routed − Current OVFD) ÷ Total Routed -- 100% means nothing is left on the vehicle.</>,
            <>
              The <strong>driver-type</strong> picker (tick more than one) filters the Region / Zone / Station / Driver views to Hybrid, Independent, OPS, Other or Rescue.
              A driver routing away from their home station counts as <strong>Rescue</strong>, whatever their own type. It never affects Old Route or Pending in Yesterday Route.
            </>,
            F.completionSummary && (
              <>
                <strong>Completion Summary</strong>: the drivers who haven't cleared their route yet, worst completion first
                (columns: Completion Rate → Current OVFD → Success Rate → Total Routed; every header sorts). "Copy for
                WhatsApp" builds a ready-to-paste list to push them before 12am.
              </>
            ),
            <><strong>Old Route</strong>: tracking numbers still stuck on an old Route ID/date.</>,
            <><strong>Pending in Yesterday Route</strong>: a frozen snapshot of everything still On Vehicle for Delivery at ~12:30am, replaced at the next 12:30am.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "aging",
    title: "Aging Details",
    body: () => (
      <p className="text-sm text-slate-700">
        Overall / 0 Attempt / Delivery / ATS / COD pivots by age bucket (0, 1, 2, 3, 4-6, 7+), grouped by where the parcel is.
        Unlike Station Health's Age &gt;3 (which leaves out On Hold / On Vehicle for Delivery), this view includes them -- the
        full picture of everything sitting in a hub by age. The tracking-number table has a Station, Status and <strong>Age</strong>{" "}
        filter (2026-09-28) -- each a dropdown where you can tick more than one -- so you can narrow it to, say, just Age 4-6 and 7+.
      </p>
    ),
  },
  {
    id: "coldchain",
    title: "Cold Chain",
    show: () => F.coldChain,
    body: () => (
      <p className="text-sm text-slate-700">
        Aging Overall, but only for the cold-chain tracking numbers: a station × age-bucket pivot and the full TN list, grouped by
        where each parcel physically is. Stations with nothing in them are hidden. Cold-chain parcels often sit at CC hubs that
        aren't stations; those show as their own "Other hubs" rows. A cold-chain TN missing from the active dataset is already
        completed or added to a shipment. You'll find it under Shipper Radar.
      </p>
    ),
  },
  {
    id: "rpu",
    title: "RPU",
    body: () => (
      <p className="text-sm text-slate-700">
        RPU Status breaks return pickups into Pending Pick Up / En Route to Sorting Hub / Pending Inbound; RPU Aging pivots the
        same data by age. Both filter by shipper (tick several), status and failure reason.
      </p>
    ),
  },
  {
    id: "recovery",
    title: "Recovery",
    body: ({ rank }) => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Five groups. <strong>Active Missing</strong> (Missing Details, Active Missing, B2B Document Active Missing) and <strong>Lost Declared</strong> (Lost Declared This Week, Lost Declared Summary) have sub-tabs. <strong>PDCNR</strong>, <strong>Damage</strong> and <strong>No Label from Hub</strong> are the recovery team's own lists, moved from their Google Sheets: Recovery adds the rows (use <em>Add rows</em>; paste many tracking numbers at once, optionally with the station), the station fills in the rest, and the row closes when the last step is done.
          <strong> PDCNR</strong> (Parcel Delivered, customer Not Received): Recovery keys Date, Platform ticket, tracking number and station; the station or its Region Head fills RH outcome, Proof of delivery (upload the photo -- or the PDF -- from your phone or PC, or choose <em>Paste link</em> and paste its Google Drive link; anyone who can see the row can open or download an upload again, a link just opens; the row shows <em>Proof missing</em> if the outcome is Customer Received without one), Driver and Action taken, within 2 working days; Recovery then validates and adds a remark, which closes it. <strong>Damage</strong>: Recovery adds the tracking number with an instruction (upload photos, repack, dispose after 2 days ...); the station answers with Action by station, which closes it. <strong>No Label from Hub</strong> goes the other way: the hub adds the entry (date received, shipment ID, temporary tracking ID, photo links, comment) and Recovery sets the outcome (Able / Unable To Recover), which closes it. Each list shows what is in your access, Open by default; <em>Days</em> counts from the date to today, or to the day it closed. Only the Recovery team and the Superadmin have full access to these lists (add, edit every column, delete, bring in the old sheet); everyone else, managers included, fills only their station columns for the stations in their access, and Fleet Admin, OPEX and Restock can only look. <em>Import from old sheet</em> (Recovery / Superadmin): paste or upload the old Google Sheet as CSV (Download as .csv) and its rows are added -- one already in the list is skipped, so it is safe to run twice; photos from the old sheet come over as the old link.
          <strong> Missing Details</strong> shows open missing-parcel tickets by Region / Zone / Station (Hub / Ship In / Other / Total) plus the
          full TN list with COD value and item description; the TN table has a <strong>Type</strong> filter (Hub, Driver/Rider, Ship In, Ship Out, Other -- pick more than one; everything except Other is on to begin with). Rows shaded red are at or above the high-value COD threshold or match
          a high-value keyword{"  "}(both editable in Recovery Settings by an admin or manager).
        </p>
        <Bullets
          items={[
            <><strong>Active Missing</strong>: the open missing tracking numbers in your access (Ship Out and the B2B documents are left out -- the documents have the next tab), oldest first, with a station summary on top. Answer for your own tracking numbers: <em>ticket updated to In Progress?</em> (Done / Not Done), <em>parcel found?</em>, <em>if not, contacted the customer?</em>, <em>customer already received?</em> (Yes / No / Waiting confirmation), <em>liable party</em> (Hub / Driver / PDCNR / Ship In / Ship Out), <em>remarks</em> and <em>check by</em>. It saves as you go. Everyone can answer for the stations in their access. A tracking number that is settled drops off the list by itself -- its answers too -- even if nobody answered it.</>,
            <><strong>B2B Document Active Missing</strong>: the same list and the same answers for the B2B documents (MYRDO / MYPSO / -DO tracking numbers) that Active Missing leaves out, with the document type (RDO / PSO / DO) in place of the parcel type.</>,
            <><strong>Lost Declared This Week</strong>: the tickets declared lost this week{rank >= 3 ? <>, from the Metabase question <em>This Week Lost Declared - All Regions</em> (an admin uploads its CSV once a day: the <em>Data upload</em> button on this tab, hidden until you open it, or Superadmin → Documents, has the Metabase link)</> : " (updated daily)"}. Region staff (managers and admins too) answer <em>customer already received?</em>, <em>liable party</em> (also TTDI Initiative), <em>remarks</em>, the <em>driver's display name</em> if it is under a driver, and <em>check by</em>; station staff and everyone else monitor what is in their access. A tracking number whose ticket changed disappears with the next update. Only tickets investigated at Last Mile stations are shown. The <em>Current status</em> column shows where each tracking number stands now (Cancelled / Completed / Returned to Sender ...).{rank >= 3 && " It comes from a second Metabase file -- the current status of every tracking number declared lost in the last 26 weeks -- that an admin uploads whenever it should be refreshed."}</>,
            <><strong>Lost Declared Summary</strong>: every Monday at 10pm what is on <em>Lost Declared This Week</em> moves here for good, answers included, and leaves <em>This Week</em>. Pick a week (weeks start on Monday) or all weeks; the by-station table counts each outcome and liable party. Region staff can still update remarks here.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "shipper",
    title: F.shipperRadar ? "Shipper Radar" : "Shipper Watch",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          {F.shipperRadar ? "Shipper SLA is the first sub-tab: " : ""}hypercare metrics for shippers with their own SLA -- Zalora NXD (0 Attempt / OVFD / Other), Amway, Watson and Cold Chain
          (0 Attempt, Aging &gt;D0: attempt day 0, succeed before day 3), Orca and Sodaxpress (OVFD vs everything else). Cold Chain here counts the
          Cold Chain parcels sitting at a station; the ones at Cold Chain hubs are in the Cold Chain sub-tab. Pick the
          shippers at the top; a station with nothing flagged is hidden, and if none is flagged the table says "all clear".
        </p>
        {F.shipperRadar && (
          <p>
            The other sub-tabs are <strong>Restock</strong>{F.coldChain ? " and " : ""}
            {F.coldChain && <strong>Cold Chain</strong>}.
          </p>
        )}
      </div>
    ),
  },
  {
    id: "restock",
    title: "Restock",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          <strong>Restock NXD</strong>: Bundles / Pieces / Potential Breach / Breach by station, counted by bundle ("Pieces" is the actual parcel count)
          {F.restockBundles ? ", plus Restock On Hold and Restock Incomplete, with the bundle-level tracking-number list underneath (filter by station and flag; the CSV lists each bundle's pieces)" : ""}.
        </p>
        {F.restockBundles ? (
          <>
            <p>
              <strong>Restock On Hold Details</strong>: bundles that are on hold and/or missing pieces, with a by-station table that has a
              column for every flag. <em>MPS incomplete</em>: fewer pieces are here than the bundle's piece count (e.g. -001 and -002 arrived
              but -003 didn't). <em>Complete but on hold</em>: every piece is here yet one is still On Hold, so the hold can be released.{" "}
              <em>On hold (single piece)</em>: a one-piece bundle on hold. This rule is provisional -- tell us if a bundle is flagged wrongly.
            </p>
            <p>
              <strong>B2B Document Compliance</strong>: every document type Redash hands back (MYRDO / DO / GRN / PSO so far -- filter with
              <em> Document type</em> above the table, empty = every type) by station and status (Pending Pickup, Van En-route to Pickup,
              En-route to Sorting Hub, Pickup Fail), grouped by where the bundle last swept. Only the 143 stations are counted; every bundle
              status is included, completed or not. <strong>Normal / Potential Breach / Breach</strong> is Redash's own classification of
              Aging (days since the bundle's delivery was marked successful): 0 days Normal, 1 day Potential Breach, more than 1 day Breach --
              the "MPS completed but document still pending" rule the Fleet Manager's sheet used to compute by hand. Click a count for its
              tracking numbers and a CSV with the bundle details.
            </p>
            <p>Restock views only include bundles sitting at one of the 143 stations.</p>
          </>
        ) : (
          <p>Document Compliance (RDO / GRN / PSO / Reattempt) is a placeholder for now; it isn't wired to real data yet.</p>
        )}
      </div>
    ),
  },
  {
    id: "urgent",
    title: F.taskList ? "Task List → Urgent TN" : "Urgent TN",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Paste one or more tracking numbers to keep an eye on. It looks them up against the same data Station Health refreshes every 15
          minutes (not a live search); "Not found" means the parcel is already completed or added to a shipment.
        </p>
        <Bullets
          items={[
            <>
              <strong>Assign a PIC</strong>: start typing a teammate's name or email and pick them from the suggestions (they must already be a dashboard user), and add an optional note.
              The tab shows a red bell with a number for them, and the item is marked NEW.
            </>,
            <>
              The <strong>PIC</strong> picks <strong>In progress</strong> (acknowledges it: the bell goes quiet for 1 hour, then rings again if it
              still isn't closed -- <strong>hourly from 8am to 8pm only</strong>, never overnight) or <strong>Closed</strong> (the bell stays off and the item stays on their list, marked closed). They can also
              type a <strong>Reply</strong> the owner sees.
            </>,
            <>
              The <strong>owner</strong> (whoever added it) sees the PIC's status and reply (the bell tells them when it changes), can change the
              PIC or note, reopen an item the PIC closed, and <strong>Close / remove</strong> it -- which removes it from the PIC's list too,
              whatever its status. While any tracking number you added is still open (not closed by the PIC, not removed by you) you also get a
              reminder bell at <strong>10am, 2pm and 5pm</strong> -- press <strong>Got it</strong> on the banner to quiet it until the next one.
            </>,
            <>
              A tracking number with <strong>no status</strong> ("Not found") is never assigned to a PIC -- it isn't urgent. It stays on
              your own list, and is removed automatically after 1 day if it still has no status (the list shows how many hours are left). Tick several rows and use <strong>Remove selected</strong> to clear them in one go.
            </>,
            <>
              <strong>More than one PIC</strong>: on a row that already has a PIC, use <strong>Assign another PIC</strong> to give the same tracking number to additional people -- the
              current PIC keeps it. A PIC can also use <strong>Assign to another PIC</strong> to pass it on while keeping their own copy; whoever
              they pick reports back to them. Each assignment is a separate row, and closing or removing one only removes that row. Rows with the same tracking number sit together by default and share a colour (with a ×2 chip), so duplicates are easy to spot; the <strong>Default order</strong> button brings that order back after you sort by a column.
            </>,
            <>
              <strong>Note and replies</strong>: forgot the note, or something changed? As the owner <strong>double-click the Note</strong> on the row, edit it and press
              <strong> Send note</strong> -- the PIC's bell rings again and the row is tagged UPDATED (only when the text actually changed). When the PIC writes back,
              <strong> double-click their PIC Reply</strong> to answer; your answer shows in the <strong>Owner Reply</strong> column. The last column, <strong>Action Taken</strong>,
              holds the status buttons and Close / remove.
            </>,
            <>
              <strong>Assign PIC</strong> on a tracking number that has nobody on it yet fills in <em>that same row</em>. A PIC passing it on
              (<strong>Assign to another PIC</strong>) always makes a <em>new row</em>, so the new PIC closes it with the person who passed it on, and that person still closes it with you.
            </>,
            <>You see the tracking numbers you added and the ones assigned to you.</>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "tasklist",
    title: "Task List",
    show: () => F.taskList,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The Task List tab keeps everything you have to chase in one place, in four sub-tabs (Urgent TN, Email / Gchat, Task Assigned, To Do List).
          Each sub-tab has its own red bell, and the tab shows them added up. A small <strong>amber dot</strong> on the tab and the sub-tab means one of
          your follow-ups, tasks or to-dos is due within 2 days (or is overdue) -- for a task or follow-up that includes ones you assigned, not only ones
          assigned to you.
        </p>
        <Bullets
          items={[
            <>
              <strong>Due dates and reminders</strong>: a due date can have an optional time. <strong>EOD</strong> fills in today, before 7pm. An open
              item with a due date rings the bell on a schedule until you press <em>got it</em>: <strong>10am, 2pm and 5pm every day</strong> once
              it is due within 2 days (or overdue), and <strong>once a day at 2pm</strong> while it is further away. It applies to Email / Gchat,
              Task Assigned and the To Do List.
            </>,
            <><strong>Urgent TN</strong>: tracking numbers you want to keep an eye on, optionally assigned to a PIC (see the Urgent TN section). Its bell has its own reminders: hourly (8am to 8pm) for a PIC, and 10am / 2pm / 5pm for whoever added the tracking number.</>,
            <>
              <strong>Email / Gchat</strong>: emails or chats you want to follow up again. Give each a due date, the <em>contact</em> (the person
              the email or chat is with -- the sender or recipient) and, if you like, a link. You can assign a <em>PIC</em> -- another dashboard
              user (start typing their name or email and pick them) -- to help reply or to remind you: they see it under <em>Assigned to me</em>,
              can <em>Acknowledge</em> it and type back what they did. You mark it Done. The bell rings for follow-ups due today or overdue, and
              for a PIC until they acknowledge.
            </>,
            <>
              <strong>To Do List</strong>: your own private tracker. Add what you need to do with a due date and a progress (0–100%; 100% counts as
              done), and optionally a reminder time -- the bell rings when it arrives, until you dismiss it or finish the item.
            </>,
            <>
              <strong>Task Assigned</strong>: give a task to one or more other dashboard users (for yourself, use the To Do List) -- each person
              gets their own copy. They mark it Open / In progress / Done and can reply; you can edit, reopen or remove each one (removing deletes it
              for that person too). The bell rings for a task you haven't picked a status for and for a reply or status change on one you assigned.
            </>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "settings",
    title: "Users, Settings and Help",
    body: ({ rank }) => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Three pages under <strong>System</strong>: <strong>Users</strong> (managers and region staff), <strong>Settings</strong> (managers and admins) and{" "}
          <strong>Help</strong> (every role).
        </p>
        <Bullets
          items={[
            rank >= 1 && (
              <>
                <strong>Users page</strong>: add, edit and remove teammates within your own level. Region staff can edit Station staff and give them
                more than one station. Find people with the search box, filter by role, scope type, a searchable scope or "Never opened", and click a column header
                (e.g. Last opened) to sort.
              </>
            ),
            rank >= 2 && (
              <>
                <strong>SLA Targets</strong>: Warning / Critical numbers per metric, nationwide or per region (Productivity per driver
                position). Turning "Scored" off makes a metric reference-only everywhere.
              </>
            ),
            rank >= 2 && <><strong>Recovery Settings</strong>: the COD-value threshold and item keywords behind Recovery's highlighting.</>,
            <>
              <strong>Help → Feedback</strong>: send a complaint, bug report, question or idea to the admin team, with an optional screenshot or PDF
              (up to 20 MB). Only you{rank >= 3 ? " (and every other admin)" : " and the admins"} can see it.{" "}
              {rank >= 3 ? "As an admin you can reply, close and reopen it. " : "Admins reply here, and a bell badge appears on Help. "}
              You can delete your own feedback at any time (it disappears for the admins too), and closed feedback is deleted automatically a
              week after it's closed.
            </>,
            <>
              <strong>Help → Guide</strong>: this page -- search it and ask the admins a question if it isn't answered.{" "}
              <strong>Help → What's new</strong> is its own tab: what's changed in the last week, newest first.
            </>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "admin",
    title: "Superadmin",
    show: ({ rank }) => rank >= 3,
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>The admin-only page: the settings only an admin can change.</p>
        <Bullets
          items={[
            <><strong>Documents</strong>: upload the driver/rider details CSV that gives Route Monitoring its Tenure column. The page links to the Metabase question (Active Driver Details) to download it from -- a temporary step until the Metabase API access is in place.</>,
            <><strong>Station List</strong>: where the app gets its stations (hub code, station, zone, region) -- the team's Region List sheet, so a station opening or closing needs no code change. Best: publish the sheet's Region tab to the web as CSV (File → Share → Publish to web) and paste the link -- the app re-reads it every hour (Sync now reads it at once). Or download the sheet and upload it. Only Active / Virtual rows in Klang Valley, Northern, Southern, East Coast and East Malaysia count (Closed, SAMEDAY and NO HUB are left out). Until you do either, the app uses the list built into it.</>,
            <><strong>KPI Settings</strong>: <em>Scope</em> -- a tick for including East Malaysia in the KPI pages (off by default: the KPI pages are for Last Mile stations, and East Malaysia is Retail) and a second tick for Sarawak (East Malaysia 3 and 4), which stays off for now even when East Malaysia is on. <em>Targets</em> -- the target of every KPI (Hybrid Productivity, Prior, FIFO D0, D0, D3, D7, Lost, Complaint, Invalid POD, COD RTS) for each region. Change a number and press Save -- the KPI pages, Trend, Invalid POD, COD RTS and Hybrid use it straight away. A changed box turns amber and shows the built-in default under it; <em>Back to default</em> puts the default back. Lost and Complaint are percentages too (0.005 means 0.005%). Hybrid Productivity is a plain number (its Productivity column) and starts empty.</>,
            <><strong>Data Refresh</strong>: trigger an immediate refresh and see when each Redash query was last pulled.</>,
            <>Feedback, the Guide and What's new are not here -- they're under Help{F.roleTester ? ", and the Role Tester is in the user menu" : ""}.</>,
          ]}
        />
      </div>
    ),
  },
];

// Quick answers to the questions people ask most. `show` gates by role/scope. Anything
// not covered can be sent to the admins as a question, which lands in Superadmin -> Feedback
// with a "[Question]" prefix so the answer comes back there.
const FAQS = [
  { q: "How often does the data refresh?", a: "Every 15 minutes. \"Data as of\" in the header is when everything was last refreshed." },
  { q: "Why does a tracking number show \"Not found\" in Urgent TN?", a: "Urgent TN looks parcels up in the same active dataset Station Health uses. A parcel that's already completed or added to a shipment is no longer in it." },
  { q: "Why can't I see another station's numbers?", a: "Your scope limits every tab, filter list and tracking-number list to your own station(s), zone(s) or region(s). Ask your admin if your scope should be wider." },
  { q: "How do I assign a tracking number to a colleague?", a: "Urgent TN tab -> paste the tracking numbers, start typing your colleague's name or email in the PIC box and pick them from the suggestions (they must already be a dashboard user), then press Track & assign. The Urgent TN tab shows a bell for them." },
  { q: "How do I find the PIC for a station?", a: "Type the station's name (or its 3-letter code, e.g. LKN) in any PIC box: the people looking after it come up -- the station's own staff first, then the Region Head and RFS of its zone, then the manager of its region -- each with their role and zone beside the name, e.g. \"Alif Afif (RH - SOUTH 1)\". The list comes from the Staff & Org Chart, kept by the Fleet Admin team -- it is no longer read from the Fleet Management sheet. Someone who isn't listed isn't in the Staff & Org Chart yet: ask your Region Head, RFS or the Fleet Admin team to add them." },
  { q: "I'm the PIC on a tracking number -- what do I do?", a: "Open the Urgent TN tab. Pick In progress to acknowledge it (the bell stays quiet for an hour and returns if it isn't closed -- hourly from 8am to 8pm, never overnight) or Closed when it's done, and use Reply to tell the person who assigned it what's happening." },
  { q: "I forgot the note when I assigned a tracking number -- can I add it later?", a: "Urgent TN tab -> double-click the row's Note -> Send note. The PIC's bell rings again and the row is tagged UPDATED (only if the note actually changed). Double-click a PIC Reply to answer what they wrote." },
  { q: "How do I get reminded to follow up an email or Gchat?", a: "Task List -> Email / Gchat: add it with a due date (and a helper if you want someone to remind you or reply for you). The bell rings when it's due or overdue.", show: () => F.taskList },
  { q: "What does Completion Rate mean?", a: "(Total Routed - Current OVFD) / Total Routed. 100% means nothing is still on the vehicle. The target is 100%.", show: () => true },
  { q: "What is the difference between Age >3 and Aging Details?", a: "Station Health's Age >3 leaves out On Hold and On Vehicle for Delivery parcels (the actionable ones). Aging Details includes everything sitting in the hub by age." },
  { q: "How do I export tracking numbers?", a: "Click any coloured count to open its tracking numbers, then Export CSV (or Copy list). Every table also has its own Export CSV for exactly what's on screen." },
  { q: "How do I test a feature as another person?", a: "Use the Role Tester in the header: pick a role and scope, or \"As a specific user\" to act as one account (their Urgent TN list, bell and feedback included). Exit puts you back as yourself.", show: ({ rank }) => rank >= 3 && F.roleTester && F.roleTesterUser },
];

// only: "guide" | "new" -- show just that half (Help -> Guide and Help -> What's new are separate tabs); leave it off for the old Guide / What's new switch.
export default function GuideTab({ me, only }) {
  const rank = rankOf(me);
  const wide = me?.scope_type === "all" || (me?.scope_values || []).length > 1;
  const ctx = useMemo(() => ({ rank, wide, me }), [rank, wide, me]);

  const [openId, setOpenId] = useState(SECTIONS[0].id);
  const [view, setView] = useState(only || "guide"); // "guide" | "new"
  const weeks = useMemo(() => weeklyChanges({ features: F, rank, wide }), [rank, wide]);
  const unread = useWhatsNewUnread(me);
  const [newIds, setNewIds] = useState(() => new Set()); // what was unread when What's new was opened
  // Opening What's new counts as reading it: remember which items were new (to tag them for
  // this visit), then clear the bell everywhere.
  const openNew = () => {
    setNewIds(new Set(unreadEntries(me).map(entryId)));
    markWhatsNewRead(me);
    setView("new");
  };
  // As its own tab, opening What's new counts as reading it straight away.
  useEffect(() => {
    if (only === "new") {
      setNewIds(new Set(unreadEntries(me).map(entryId)));
      markWhatsNewRead(me);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [showOlder, setShowOlder] = useState(false); // earlier weeks stay hidden until asked for
  const [openWeek, setOpenWeek] = useState(null);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const q = query.trim().toLowerCase();
  const visibleSections = useMemo(() => SECTIONS.filter((s) => !s.show || s.show(ctx)), [ctx]);
  const visibleFaqs = useMemo(() => FAQS.filter((f) => !f.show || f.show(ctx)), [ctx]);
  const faqs = useMemo(() => (q ? visibleFaqs.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q)) : visibleFaqs), [q, visibleFaqs]);
  const sections = useMemo(() => (q ? visibleSections.filter((s) => s.title.toLowerCase().includes(q)) : visibleSections), [q, visibleSections]);

  const ask = async () => {
    if (!question.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.feedback.submit(`[Question] ${question.trim()}`);
      setQuestion("");
      setSent(true);
      window.dispatchEvent(new Event("notifications-changed"));
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  const switcher = only ? null : (
    <SegmentedControl
      options={[
        { key: "guide", label: "Guide" },
        {
          key: "new",
          label: (
            <>
              What's new{weeks[0].items.length ? ` (${weeks[0].items.length})` : ""}
              <BellBadge count={unread} title="Updates you haven't read yet" />
            </>
          ),
        },
      ]}
      value={view}
      onChange={(k) => (k === "new" ? openNew() : setView(k))}
    />
  );

  if (view === "new") {
    const [latest, ...older] = weeks;
    const WeekItems = ({ items }) =>
      items.length === 0 ? (
        <div className="px-4 py-4 text-sm text-slate-400">Nothing new yet this week.</div>
      ) : (
        <div className="divide-y divide-slate-100">
          {items.map((c) => (
            <details key={c.title} className="group px-4 py-2.5">
              <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">
                <span className="mr-2 text-slate-400 group-open:hidden">+</span>
                <span className="mr-2 hidden text-slate-400 group-open:inline">−</span>
                {c.title}
                {newIds.has(entryId(c)) && (
                  <span className="ml-2 rounded bg-status-critical px-1.5 py-0.5 font-display text-[10px] font-semibold text-white">NEW</span>
                )}
              </summary>
              <ul className="mt-1.5 list-disc space-y-1 pl-9 text-sm text-slate-600">
                {c.points.map((pt, i) => (
                  <li key={i}>{pt}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
      );
    return (
      <div className="space-y-2">
        {switcher}
        <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
          <div className="font-display text-sm font-semibold text-slate-800">What's new</div>
          <p className="mt-1 text-sm text-slate-500">
            A weekly summary of what changed in the dashboard, newest week first, showing what applies to your role. Click an item for the details.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
          <div className="flex items-baseline justify-between border-b border-slate-100 bg-slate-50/60 px-4 py-2">
            <span className="font-display text-sm font-semibold text-slate-800">{latest.label}</span>
            <span className="text-xs text-slate-400">{latest.range}</span>
          </div>
          <WeekItems items={latest.items} />
        </div>

        {older.length > 0 && (
          <>
            <button
              onClick={() => setShowOlder((v) => !v)}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 font-display text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              {showOlder ? "Hide earlier weeks" : `Show earlier weeks (${older.length})`}
            </button>
            {showOlder &&
              older.map((w) => {
                const open = openWeek === w.key;
                return (
                  <div key={w.key} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
                    <button
                      onClick={() => setOpenWeek(open ? null : w.key)}
                      className="flex w-full min-h-[44px] items-center justify-between px-4 py-2.5 text-left"
                    >
                      <span>
                        <span className="font-display text-sm font-medium text-slate-800">{w.label}</span>
                        <span className="ml-2 text-xs text-slate-400">
                          {w.range} · {w.items.length} update{w.items.length === 1 ? "" : "s"}
                        </span>
                      </span>
                      <span className="text-slate-400">{open ? "−" : "+"}</span>
                    </button>
                    {open && (
                      <div className="border-t border-slate-100">
                        <WeekItems items={w.items} />
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {switcher}
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-slate-800">How to use this dashboard</div>
        <p className="mt-1 text-sm text-slate-500">
          A quick reference for what each tab is for and the logic behind the less-obvious columns -- showing what applies to your
          role and scope. Search below, or click a section to expand it.
        </p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the guide and common questions…"
          className="mt-3 w-full max-w-md rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm"
        />
      </div>

      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
        <div className="border-b border-slate-100 px-4 py-2 font-display text-sm font-medium text-slate-800">
          Common questions{q && ` (${faqs.length})`}
        </div>
        {faqs.length === 0 ? (
          <div className="px-4 py-4 text-sm text-slate-400">No common question matches "{query}".</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {faqs.map((f) => (
              <details key={f.q} className="group px-4 py-2.5">
                <summary className="cursor-pointer list-none text-sm font-medium text-slate-800">
                  <span className="mr-2 text-slate-400 group-open:hidden">+</span>
                  <span className="mr-2 hidden text-slate-400 group-open:inline">−</span>
                  {f.q}
                </summary>
                <p className="mt-1.5 pl-5 text-sm text-slate-600">{f.a}</p>
              </details>
            ))}
          </div>
        )}
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
          <div className="text-sm font-medium text-slate-700">Didn't find your answer? Ask it.</div>
          <p className="text-xs text-slate-400">
            It goes to the admins as feedback marked [Question]; their reply appears in Help → Feedback and a bell badge shows on Help.
          </p>
          <textarea
            className="mt-2 w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm"
            rows={2}
            placeholder="Type your question…"
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
              setSent(false);
            }}
          />
          <div className="mt-1.5 flex items-center gap-3">
            <button
              onClick={ask}
              disabled={sending || !question.trim()}
              className="rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {sending ? "Sending…" : "Ask the admins"}
            </button>
            {sent && <span className="text-xs text-status-good">Sent — watch Help → Feedback for the reply.</span>}
            {error && <span className="text-xs text-status-critical">{error}</span>}
          </div>
        </div>
      </div>

      {sections.map((s) => {
        const open = openId === s.id || (!!q && sections.length <= 3);
        return (
          <div key={s.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <button
              onClick={() => setOpenId(open ? null : s.id)}
              className="flex w-full min-h-[44px] items-center justify-between px-4 py-2.5 text-left font-display text-sm font-medium text-slate-800"
            >
              {s.title}
              <span className="text-slate-400">{open ? "−" : "+"}</span>
            </button>
            {open && <div className="border-t border-slate-100 px-4 py-3">{s.body(ctx)}</div>}
          </div>
        );
      })}
    </div>
  );
}
