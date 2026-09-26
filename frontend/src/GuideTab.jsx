import { useMemo, useState } from "react";
import { api } from "./api";
import { FEATURES as F } from "./lib/features";
import { weeklyChanges } from "./lib/changelog";
import SegmentedControl from "./components/SegmentedControl";
import BellBadge from "./components/BellBadge";
import { entryId, markWhatsNewRead, unreadEntries, useWhatsNewUnread } from "./lib/whatsNew";

// In-app onboarding reference (Settings -> Guide, open to everyone).
//
// RULES FOR MAINTAINERS (2026-09-25 feedback):
//  * Keep this up to date whenever a build changes something a user can see -- new tab,
//    renamed column, changed behaviour. The Guide is part of the change.
//  * It only describes what the CURRENT build ships (lib/features.js flags), and only
//    what the signed-in user's role and scope can actually see: a station user is never
//    told about Region staff, Manager or Admin tools. Gate a section / FAQ / sentence
//    with ctx.rank (0 station, 1 region, 2 manager, 3 admin) or ctx.wide (scope covers
//    more than one station).
const RANK = { station: 0, region: 1, manager: 2, admin: 3 };

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
        { role: "Station staff", rank: 0, text: "View the dashboard for their own scope only, plus Settings → Feedback and Guide." },
        { role: "Region staff", rank: 1, text: "View the dashboard, plus add, edit and remove Station-staff teammates (with more than one station if needed) in Settings → Users." },
        { role: "Manager", rank: 2, text: "All of the above, plus add and manage Region and Station staff, and edit SLA Targets and Recovery Settings." },
        { role: "Admin", rank: 3, text: `Everything: full user management, all Settings screens, the Admin page (Documents, Station List, KPI Settings, Data Refresh), replying to feedback${F.roleTester ? " and the Role Tester" : ""}.` },
      ].filter((r) => r.rank <= rank);
      return (
        <div className="space-y-2 text-sm text-slate-700">
          <p>
            Two independent things control what you can do and see: your <strong>role</strong> (what actions you're
            allowed) and your <strong>scope</strong> (which stations' data you see). {rank >= 1 ? "An admin or manager sets both when adding someone in Settings → Users." : "Your admin sets both."}
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
            <strong>Settings</strong> shows a red bell for a reply to your feedback or an update you haven't read in{" "}
            <strong>Guide → What's new</strong>; it clears once you've read it.
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
          <><strong>Total Fresh</strong> / <strong>Total Shipment</strong>: today's order volume and shipment count for the hub.</>,
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
              The <strong>timing chart</strong> under the table plots scan-in, first-attempt and success times by hour of day. Hover an hour for its
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
            <><strong>Age &gt;3</strong> is parcels sitting in-hub more than 3 days, scored as a count or as a % of Total In Hub.</>,
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
            <><strong>Dashboard</strong> -- <strong>Trend</strong> (Daily / Weekly / Monthly; only Weekly for now -- the team's WoW dashboard): pick a region, zone or station and see every KPI (Success Rate, D-0, FIFO D0, D-3, T-7, COD RTS, Sweep, Prior, Invalid POD, Complaint, Lost, Shipment Inbound, RPU) for the past 4 weeks against its target (green on target, red ▲ missing), a trend line per KPI, and the stations underneath for the chosen week. <strong>OPEX</strong> (first in the menu) shows the OPEX dashboard's result: every hub (or area / region) with each KPI's rate against its target, green when met and red when missed, and how many KPIs it missed; admins load it from the OPEX dashboard's <em>Download CSV</em>. It gets merged into the Trend later. <strong>Access</strong>: OPEX is open to everyone in full; Trend and every RCA analysis page follow your own region / zone / station. <strong>East Malaysia</strong> (Retail, not Last Mile) is left out of every KPI page unless an admin includes it under Admin → KPI Settings; <strong>Sarawak</strong> (East Malaysia 3 and 4) stays out for now even then.</>,
            <><strong>RCA analysis</strong> -- in this order: Hybrid, Prior, FIFO D0, Completion D0, Completion D3, Terminal T7, COD RTS, Lost, Invalid POD and Complaint (Lost and Complaint are marked <em>soon</em> and will share their logic later). <strong>Hybrid Productivity</strong> (sub-tabs: <em>Driver Performance</em>, <em>Station Performance</em>, <em>Zone Breakdown</em> for region staff and above, <em>Regional Breakdown</em> for managers and admins, and <em>Daily Data (Current Month)</em>; every table has a <em>vs last week / month</em> column showing whether productivity rose or dropped, and two ticks above the tables show only the increasing or only the dropping rows; attendance below the target -- 6 days a week, 26 a month -- is red; the low performers are the drivers under their region's productivity target (set under Admin → KPI Settings; 80 until a region has one); <em>Daily Data (Current Month)</em> always adds up the current month, whatever View and Period say, and Service Duration comes from the driver list's start date), <strong>Invalid POD</strong> (sub-tabs: <em>Overview</em> -- invalid % by station against the 25% target, the reasons behind it, the drivers with the most, the tracking numbers; <em>Drivers &amp; reasons</em> -- every driver with invalid POD and their top invalid reason, and the day-by-day trend of a picked driver; <em>Date trend</em> -- invalid % / count per day, week or month for a region, zone, station or driver; <em>Reasons</em> -- each reason and which stations it comes from; and, for managers and admins only, <em>LM performance</em> -- the weekly LM POD Performance view: zones, stations, drivers and OPS routes on the final result after the audit) and <strong>COD RTS</strong> (COD parcels returned to the shipper; sub-tabs: <em>Overview</em>, <em>Reasons</em>, <em>Shippers</em> with the cumulative share and the parent-shipper roll-up, <em>Drivers</em> with their top reason, <em>Timing &amp; attempts</em>, <em>Parcels</em> by size / driver type / status / FIFO, <em>Date trend</em>, and the <em>Tracking numbers</em>). In these tables a column that shows a count with a % sorts by the %. <strong>Prior KPI</strong>, <strong>FIFO D0</strong>, <strong>Terminal T7</strong> and <strong>Completion D0 / D3</strong> each have an <em>Overview</em> (the period picked: the % met against the target, the change on the period before, the regions / zones / stations under target -- worst first, with an <em>Under target only</em> tick -- and the official OPEX number beside it), <em>Day by day</em> (the station-by-day grid of the period: the % met of every station on every day, green on target and red under it, Sundays shaded, the period's total on the right; click a header to sort) and a <em>Trend</em> (% met per day, week or month for regions, zones and stations, by start-clock date -- Terminal T7 by its N7 cut-off date, so a T7 week is final once it is over -- with the target line; Prior measures each TN against its working start-clock date -- the clock pauses and restarts around PETs -- but reports the result and the trend by start-clock date). <strong>Weekly / Monthly / Daily</strong>: like Hybrid Productivity, Prior, FIFO D0, Terminal T7, Completion D0 / D3, COD RTS and Invalid POD have a <em>View</em> and a <em>Period</em>. A week runs Monday to Sunday and is numbered like the team's sheets (week 38 = 14-20 Sep 2026); the page opens on the last complete week, <em>Monthly</em> on the last complete month and <em>Daily</em> on the current month, day by day -- any earlier week or month is one pick away, and the week or month still in progress is there too, marked <em>so far</em>. The View also sets the trend's grain (Day shows the days of the period picked; Week and Month run over everything in the file). The Prior, FIFO, Completion and Terminal files hold 26 weeks; COD RTS and Invalid POD offer the weeks and months inside the file that was uploaded (a file that holds a whole month gives the month). The numbers to quote are the <strong>OPEX result</strong>; these pages show where a KPI is slipping, and their exclusions are provisional until confirmed with OPEX. Only stations count: hubs in the file that are not on the station list (return hubs, cross-dock, cold-chain, PUDO ...) are left out, and managers and admins are told how many hubs and TNs under the numbers. <strong>Targets are per region</strong> (Klang Valley, Northern, Southern, East Coast, East Malaysia; an admin sets them under <em>Admin → KPI Targets</em>): every station, zone and region is judged against its own region's target, and the Weekly Dashboard, Invalid POD and COD RTS do the same. A total that spans regions is judged against the blend of their targets and says so.</>,
            <>Click a station, reason or driver to filter the rest of the page; <strong>Show tracking numbers</strong> lists them and <strong>Export CSV</strong> downloads them all.</>,
            rank >= 3 ? (
              <><strong>Data upload</strong> (admins only -- nobody else sees the upload cards or the Metabase links): each page has a Data upload button. Prior, Completion D0 / D3, Terminal T7 and FIFO D0 each load from a small Metabase file of the last 26 weeks, station by day (Prior 127199, Completion 127200, Terminal 127201, FIFO D0 127205). COD RTS and Invalid POD read the weeks inside the file -- for a monthly view download a date range that covers the month. Every slot has an <em>Open in Metabase</em> link (or, for the OPEX result, a link to the OPEX dashboard): click it, download the results as CSV, then choose the file -- CSV or Excel; for a workbook the right sheet is picked for you -- and it is loaded straight away. One current file per slot; uploading again replaces it. For Hybrid Productivity an uploaded file is used instead of Metabase until you remove it.</>
            ) : null,
            rank >= 3 && (
              <>Hybrid Productivity can also read Metabase directly. If it shows a 401 error, open that page's <strong>Check Metabase connection</strong> for a plain-English reason. The app reads four <em>All Regions</em> copies of the team's saved Metabase questions (same columns, the Southern filter removed), so it covers every station once the connection works.</>
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
            <><strong>Daily View</strong>: pick a day and see every region / zone / station with <em>Shipment Details</em> (Total Fresh, Fresh Unscan, Latlong), <em>Station Health</em> (Total 0 Attempt, In Hub, Age &gt;3) and <em>Route Monitoring</em> (Attendance with rescue in brackets, Total Routed, Success Rate, and Pending in Apps -- the Current OVFD, parcels still on a vehicle). The small ▲ / ▼ is the change from the day before, green when it is an improvement. Export CSV gives the day.</>,
            <><strong>Weekly Overview</strong>: pick <strong>one or more measures</strong> and see them across Mon–Sun -- this week, last week, or both. With several measures the chart draws them all (each on its own scale; hover a day for the real numbers), and the details table below shows <strong>one measure at a time</strong> -- switch it with the <em>Details table for</em> buttons. Click a row of the table to draw that row.</>,
            <>Success Rate = Total Success ÷ Total Routed; Productivity (in the measure list) = Total Routed ÷ Attendance.</>,
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
        full picture of everything sitting in a hub by age.
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
          Five sub-tabs. <strong>Missing Details</strong> shows open missing-parcel tickets by Region / Zone / Station (Hub / Ship In / Other / Total) plus the
          full TN list with COD value and item description; the TN table has a <strong>Type</strong> filter (Hub, Driver/Rider, Ship In, Ship Out, Other -- pick more than one; everything except Other is on to begin with). Rows shaded red are at or above the high-value COD threshold or match
          a high-value keyword{"  "}(both editable in Recovery Settings by an admin or manager).
        </p>
        <Bullets
          items={[
            <><strong>Active Missing</strong>: the open missing tracking numbers in your access (Ship Out and the B2B documents are left out -- the documents have the next tab), oldest first, with a station summary on top. Answer for your own tracking numbers: <em>ticket updated to In Progress?</em> (Done / Not Done), <em>parcel found?</em>, <em>if not, contacted the customer?</em>, <em>customer already received?</em> (Yes / No / Waiting confirmation), <em>liable party</em> (Hub / Driver / PDCNR / Ship In / Ship Out), <em>remarks</em> and <em>check by</em>. It saves as you go. Everyone can answer for the stations in their access. A tracking number that is settled drops off the list by itself -- its answers too -- even if nobody answered it.</>,
            <><strong>B2B Document Active Missing</strong>: the same list and the same answers for the B2B documents (MYRDO / MYPSO / -DO tracking numbers) that Active Missing leaves out, with the document type (RDO / PSO / DO) in place of the parcel type.</>,
            <><strong>Lost Declared This Week</strong>: the tickets declared lost this week{rank >= 3 ? <>, from the Metabase question <em>This Week Lost Declared - All Regions</em> (an admin uploads its CSV once a day: the <em>Data upload</em> button on this tab, hidden until you open it, or Admin → Documents, has the Metabase link)</> : " (updated daily)"}. Region staff (managers and admins too) answer <em>customer already received?</em>, <em>liable party</em> (also TTDI Initiative), <em>remarks</em>, the <em>driver's display name</em> if it is under a driver, and <em>check by</em>; station staff and everyone else monitor what is in their access. A tracking number whose ticket changed disappears with the next update. Only tickets investigated at Last Mile stations are shown. The <em>Current status</em> column shows where each tracking number stands now (Cancelled / Completed / Returned to Sender ...).{rank >= 3 && " It comes from a second Metabase file -- the current status of every tracking number declared lost in the last 26 weeks -- that an admin uploads whenever it should be refreshed."}</>,
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
              <strong>B2B Document Compliance</strong> (RDO for now): RDO tracking numbers by station and RDO status (Pending Pickup, Van
              En-route to Pickup, En-route to Sorting Hub, Pickup Fail), grouped by where the bundle last swept. Only the 143 stations are
              counted; every bundle status is included, completed or not. Click a count for its tracking numbers and a CSV with the bundle
              details; the list shows Age (days since the RDO was created).
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
    title: "Settings",
    body: ({ rank }) => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>Configuration and help, reachable by every role -- which tabs you see inside depends on your role.</p>
        <Bullets
          items={[
            rank >= 1 && (
              <>
                <strong>Users</strong>: add, edit and remove teammates within your own level. Region staff can edit Station staff and give them
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
              <strong>Feedback</strong>: send a complaint, bug report, question or idea to the admin team, with an optional screenshot or PDF
              (up to 20 MB). Only you{rank >= 3 ? " (and every other admin)" : " and the admins"} can see it.{" "}
              {rank >= 3 ? "As an admin you can reply, close and reopen it. " : "Admins reply here, and a red bell appears on Settings. "}
              You can delete your own feedback at any time (it disappears for the admins too), and closed feedback is deleted automatically a
              week after it's closed.
            </>,
            <>
              <strong>Guide</strong>: this page -- search it, ask the admins a question if it isn't answered, and see what's changed in the last
              week under <strong>What's new</strong>.
            </>,
          ]}
        />
      </div>
    ),
  },
  {
    id: "admin",
    title: "Admin",
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
            <>Feedback and the Guide are not here -- they're under Settings{F.roleTester ? ", and the Role Tester is in the header" : ""}.</>,
          ]}
        />
      </div>
    ),
  },
];

// Quick answers to the questions people ask most. `show` gates by role/scope. Anything
// not covered can be sent to the admins as a question, which lands in Admin -> Feedback
// with a "[Question]" prefix so the answer comes back there.
const FAQS = [
  { q: "How often does the data refresh?", a: "Every 15 minutes. \"Data as of\" in the header is when everything was last pulled from Redash." },
  { q: "Why does a tracking number show \"Not found\" in Urgent TN?", a: "Urgent TN looks parcels up in the same active dataset Station Health uses. A parcel that's already completed or added to a shipment is no longer in it." },
  { q: "Why can't I see another station's numbers?", a: "Your scope limits every tab, filter list and tracking-number list to your own station(s), zone(s) or region(s). Ask your admin if your scope should be wider." },
  { q: "How do I assign a tracking number to a colleague?", a: "Urgent TN tab -> paste the tracking numbers, start typing your colleague's name or email in the PIC box and pick them from the suggestions (they must already be a dashboard user), then press Track & assign. The Urgent TN tab shows a bell for them." },
  { q: "I'm the PIC on a tracking number -- what do I do?", a: "Open the Urgent TN tab. Pick In progress to acknowledge it (the bell stays quiet for an hour and returns if it isn't closed -- hourly from 8am to 8pm, never overnight) or Closed when it's done, and use Reply to tell the person who assigned it what's happening." },
  { q: "I forgot the note when I assigned a tracking number -- can I add it later?", a: "Urgent TN tab -> double-click the row's Note -> Send note. The PIC's bell rings again and the row is tagged UPDATED (only if the note actually changed). Double-click a PIC Reply to answer what they wrote." },
  { q: "How do I get reminded to follow up an email or Gchat?", a: "Task List -> Email / Gchat: add it with a due date (and a helper if you want someone to remind you or reply for you). The bell rings when it's due or overdue.", show: () => F.taskList },
  { q: "What does Completion Rate mean?", a: "(Total Routed - Current OVFD) / Total Routed. 100% means nothing is still on the vehicle. The target is 100%.", show: () => true },
  { q: "What is the difference between Age >3 and Aging Details?", a: "Station Health's Age >3 leaves out On Hold and On Vehicle for Delivery parcels (the actionable ones). Aging Details includes everything sitting in the hub by age." },
  { q: "How do I export tracking numbers?", a: "Click any coloured count to open its tracking numbers, then Export CSV (or Copy list). Every table also has its own Export CSV for exactly what's on screen." },
  { q: "My numbers look different from Redash.", a: "The dashboard groups parcels by where they physically are (last scan hub), not their intended destination, unless a column's note says otherwise. Click the small i beside a column header for the exact rule, then send us a question if it still doesn't match." },
  { q: "How do I change someone's access?", a: "Settings -> Users -> Edit. You can only grant a role and scope at or below your own. Region staff can edit Station staff and give them more than one station.", show: ({ rank }) => rank >= 1 },
  { q: "Who has never opened the dashboard?", a: "Settings -> Users: tick \"Never opened\", or click the Last opened header to sort.", show: ({ rank }) => rank >= 1 },
  { q: "How do I test a feature as another person?", a: "Use the Role Tester in the header: pick a role and scope, or \"As a specific user\" to act as one account (their Urgent TN list, bell and feedback included). Exit puts you back as yourself.", show: ({ rank }) => rank >= 3 && F.roleTester && F.roleTesterUser },
  { q: "How do I reply to feedback?", a: "Settings -> Feedback -> type in the reply box under the message and Send reply; Close it when it's done (it's deleted a week later).", show: ({ rank }) => rank >= 3 },
];

export default function GuideTab({ me }) {
  const rank = RANK[me?.role] ?? 0;
  const wide = me?.scope_type === "all" || (me?.scope_values || []).length > 1;
  const ctx = useMemo(() => ({ rank, wide, me }), [rank, wide, me]);

  const [openId, setOpenId] = useState(SECTIONS[0].id);
  const [view, setView] = useState("guide"); // "guide" | "new"
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

  const switcher = (
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
            It goes to the admins as feedback marked [Question]; their reply appears in Settings → Feedback and a red bell shows on Settings.
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
            {sent && <span className="text-xs text-status-good">Sent — watch Settings → Feedback for the reply.</span>}
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
