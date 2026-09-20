import { useState } from "react";

// In-app onboarding reference -- explains roles/scope, the header controls,
// and every tab's purpose + the logic behind its less-obvious columns. Kept as
// one accordion (not a wall of text) so a new user can jump straight to the
// tab they're confused about. Lives in Admin -> Guide, reachable by everyone.
const SECTIONS = [
  {
    id: "roles",
    title: "Roles & what you see",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Two independent things control what you can do and see: your <strong>role</strong> (what actions you're
          allowed) and your <strong>scope</strong> (which stations' data you see). An admin sets both when adding you
          in Settings → Users.
        </p>
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400">
            <tr>
              <th className="py-1 pr-3">Role</th>
              <th className="py-1">Can do</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            <tr>
              <td className="py-1 pr-3 font-medium">Station staff</td>
              <td className="py-1">View the dashboard for their own scope only, plus Admin → Feedback/Guide. No Settings access.</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 font-medium">Region staff</td>
              <td className="py-1">View the dashboard, plus add Station-staff teammates in Settings → Users.</td>
            </tr>
            <tr>
              <td className="py-1 pr-3 font-medium">Manager</td>
              <td className="py-1">
                All of the above, plus add Region/Station staff, and edit SLA Targets and Recovery Settings.
              </td>
            </tr>
            <tr>
              <td className="py-1 pr-3 font-medium">Admin</td>
              <td className="py-1">Everything: full user management, both Settings screens, and manual data refresh.</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Scope</strong> (Station / Zone / Region / Everything) narrows every table on every tab to just
          that slice of the network, automatically -- a station-scoped user never sees another station's numbers,
          even by typing a different one into search. "Everything" scope gets the Region/Zone/Station filter bar and
          a search box to narrow down manually.
        </p>
      </div>
    ),
  },
  {
    id: "header",
    title: "Header & general controls",
    body: (
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
        <li>
          <strong>Data as of X</strong> (top right) is when the numbers on every tab were last pulled from Redash --
          the whole app refreshes together every 30 minutes, so this one timestamp covers everything except Urgent TN
          (see below) and Pending in Yesterday Route (captured once daily at ~12:30am, see Routed View).
        </li>
        <li>
          <strong>Compact / Comfortable</strong> toggles row height/density -- personal preference, doesn't change any
          data.
        </li>
        <li>
          <strong>Region / Zone / Station filters + search</strong> (only shown if your scope is "Everything" or wide
          enough to need them) apply to most tabs at once -- Action Board, Shipment Details, Station Health, Routed
          View, Aging Details, RPU, Recovery and Shipper Watch all follow the same filter selection.
        </li>
        <li>
          <strong>Include East Malaysia</strong> is off by default (it's Retail, not Last Mile) -- full-access
          viewers can switch it back on.
        </li>
        <li>
          Clicking a <strong>clickable number</strong> (usually coloured) opens a tracking-number list for exactly
          that metric at that station. Clicking a <strong>row</strong> opens a full detail slide-over with every
          column for that row.
        </li>
        <li>Every table has an <strong>Export CSV</strong> button that exports exactly what's currently filtered/sorted on screen.</li>
      </ul>
    ),
  },
  {
    id: "action",
    title: "Action Board",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          The "what do I act on today" tab. Pick which metrics matter to you from the picker at the top -- it draws
          from Station Health plus a few extras (Old Route's stuck count, Zalora NXD 0 Attempt/OVFD, and Routed
          View's Current OVFD, which is heatmap-only since it has no tracking-number list behind it).
        </p>
        <p>
          The heatmap groups by Region/Zone/Station and colours each cell by whether it's breaching the Warning/
          Critical target set in Settings → SLA Targets. "Act on these today" lists the worst individual stations,
          worst first, each with a <strong>Copy TNs</strong> and <strong>Export CSV</strong> button that group the
          tracking numbers by which metric flagged them.
        </p>
      </div>
    ),
  },
  {
    id: "shipment",
    title: "Shipment Details",
    body: (
      <ul className="list-disc space-y-1.5 pl-5 text-sm text-slate-700">
        <li><strong>Total Fresh</strong> / <strong>Total Shipment</strong>: today's order volume and shipment count for the hub.</li>
        <li><strong>Fresh Unscan</strong>: fresh parcels that haven't been scanned in at the hub yet.</li>
        <li><strong>Latlong</strong>: parcels that ended up shipped somewhere other than their real destination.</li>
        <li><strong>Fresh Attempt %</strong>: attempted ÷ total fresh, target ≥96%.</li>
        <li><strong>LH Timing</strong>: each line-haul trip's arrival time and the parcel count on that trip (e.g. "10:32am · 45" = 45 parcels). Colour bands: green before 10am, blue 10–11am, amber 11am–12pm, red after 12pm.</li>
        <li>
          <strong>Process Time</strong> is a <span className="font-medium text-status-warning">beta figure, not yet
          confirmed accurate</span> -- it's the average time-of-day <em>all</em> of today's fresh parcels were first
          scanned/swept in, not a measurement of any single parcel.
        </li>
      </ul>
    ),
  },
  {
    id: "health",
    title: "Station Health",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>The master per-station KPI table. Every column follows the same "grouped by last_scan_hub_name" rule (where a parcel physically is right now), except the missing/routed columns which have their own logic noted below.</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>0 Attempt</strong> is age-0 only; <strong>0 Attempt &gt;D0</strong> is the same thing aged &gt;0 days -- the two never overlap.</li>
          <li><strong>Age &gt;3</strong> is parcels sitting in-hub &gt;3 days -- an admin can score this as a raw count or as a % of Total In Hub (a header note appears when it's set that way).</li>
          <li><strong>Missing (Hub)</strong> / <strong>(Ship-in)</strong>: open missing-parcel tickets, split by whether the station itself or an inbound shipment is on the hook for it.</li>
          <li><strong>Routed %</strong>: Total Routed ÷ (Total Routed + Total In Hub) -- how much of what could be routed already has been.</li>
          <li>
            Coloured cells (▲ critical / ■ warning / plain = good) are metrics with an SLA target, set in Settings → SLA
            Targets. Grey/shaded cells have no SLA -- they're shaded on a relative scale instead: darkest = highest
            value. By region/By zone shade against every region/zone shown; this table shades each station only
            against other stations in its own zone. That shading is a ranking, never a pass/fail judgement.
          </li>
        </ul>
      </div>
    ),
  },
  {
    id: "routed",
    title: "Routed View",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>Switch between Region / Zone / Station / Driver / Old Route / Pending in Yesterday Route with the level switcher.</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Productivity</strong>: Total Success ÷ Total Routed, shown as a plain number (not a %) -- at the driver level it's scored against a target set per driver position (Hybrid Driver/Rider, Independent Driver/Rider) in Settings → SLA Targets.</li>
          <li><strong>Completion Rate</strong>: (Total Routed − Current OVFD) ÷ Total Routed -- 100% means nothing is left on the vehicle.</li>
          <li>The <strong>driver-type dropdown</strong> (deliberately a plain select, not a tab-style button) filters Region/Zone/Station/Driver views to Hybrid, Independent or Other drivers only. It never affects Old Route or Pending in Yesterday Route -- neither has a driver concept.</li>
          <li><strong>Old Route</strong>: tracking numbers still stuck on an old Route ID/date.</li>
          <li><strong>Pending in Yesterday Route</strong>: a frozen snapshot of everything still On Vehicle for Delivery at ~12:30am Malaysia time -- stays fixed all day, replaced at the next 12:30am capture.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "aging",
    title: "Aging Details",
    body: (
      <p className="text-sm text-slate-700">
        Overall / 0 Attempt / Delivery / ATS / COD pivots by age bucket (0, 1, 2, 3, 4-6, 7+), grouped the same way as
        everywhere else. Unlike Station Health's Age &gt;3 (which excludes On Hold/On Vehicle for Delivery), this view
        includes them -- it's the full picture of everything sitting in a hub by age, not just the actionable subset.
      </p>
    ),
  },
  {
    id: "rpu",
    title: "RPU",
    body: (
      <p className="text-sm text-slate-700">
        RPU Status breaks pickups into Pending Pick Up / En Route to Sorting Hub / Pending Inbound. RPU Aging pivots
        the same data by age bucket instead. Both can be filtered to one shipper at a time.
      </p>
    ),
  },
  {
    id: "recovery",
    title: "Recovery",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Missing Details shows open missing-parcel tickets by Region/Zone/Station (Hub/Ship In/Other/Total), plus
          the full TN list with COD Value and Item description.
        </p>
        <p>
          Rows shaded red have a COD value at or above the threshold, or an item description matching a keyword --
          both are editable in <strong>Settings → Recovery Settings</strong>. The TN list has its own station search box,
          separate from the shared one above, so you can narrow just that table to one station without touching the
          overview tables.
        </p>
      </div>
    ),
  },
  {
    id: "shipper",
    title: "Shipper Watch",
    body: (
      <p className="text-sm text-slate-700">
        Hypercare metrics for a handful of shippers with their own SLA: Zalora NXD (0 Attempt / OVFD / Other status),
        Amway and Watson (0 Attempt, Aging &gt;D0 -- their SLA is attempt day 0, succeed before day 3), Orca and
        Sodaxpress (OVFD vs everything else). Use the Shippers picker at the top to show just the ones you care about
        -- pick more than one to compare them side by side.
      </p>
    ),
  },
  {
    id: "restock",
    title: "Restock",
    body: (
      <p className="text-sm text-slate-700">
        Restock NXD is live: Bundles/Pieces/Potential Breach/Breach, counted by bundle -- "Pieces" is the actual
        parcel count. Document Compliance (RDO/GRN/PSO/Reattempt) is a placeholder for now; it isn't wired to real
        data yet.
      </p>
    ),
  },
  {
    id: "urgent",
    title: "Urgent TN",
    body: (
      <p className="text-sm text-slate-700">
        A personal watchlist -- paste one or more tracking numbers you want to keep an eye on. It looks them up
        against the same data Station Health already refreshes every 30 minutes (not a live search), and remembers
        your list the next time you open the tab.
      </p>
    ),
  },
  {
    id: "settings",
    title: "Settings",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Nationwide configuration -- only reachable by Admin, Manager and Region-staff roles (station-scoped users
          don't see this nav item at all).
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Users</strong>: add/edit teammates. You can only grant a role/scope at or below your own.</li>
          <li>
            <strong>SLA Targets</strong>: set Warning/Critical numbers per metric, at a Nationwide default or a region
            override (Productivity uses driver-position overrides instead). Turning "Scored" off makes a metric
            reference-only everywhere at once. "Score as % of" evaluates a metric as a percentage of another field on
            the same row instead of its raw count.
          </li>
          <li><strong>Recovery Settings</strong>: the COD-value threshold and item keywords behind Recovery's high-value highlighting.</li>
          <li><strong>Data Refresh</strong> (admin only): trigger an immediate refresh and see when the last one ran.</li>
        </ul>
      </div>
    ),
  },
  {
    id: "admin",
    title: "Admin",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Day-to-day tools, open to every role regardless of scope -- this is where you're reading this Guide right
          now. Feedback and Guide are here for now; more will be added over time (attendance is planned next).
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li><strong>Feedback</strong>: send a complaint, bug report, or idea straight to the admin team. Only a full admin can read what's been submitted.</li>
          <li><strong>Guide</strong>: this page.</li>
        </ul>
      </div>
    ),
  },
];

export default function GuideTab() {
  const [openId, setOpenId] = useState(SECTIONS[0].id);

  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-slate-800">How to use this dashboard</div>
        <p className="mt-1 text-sm text-slate-500">
          A quick reference for new users -- what each role sees, what each tab is for, and the logic behind the
          less-obvious columns. Click a section to expand it.
        </p>
      </div>
      {SECTIONS.map((s) => {
        const open = openId === s.id;
        return (
          <div key={s.id} className="overflow-hidden rounded-xl bg-white ring-1 ring-slate-200">
            <button
              onClick={() => setOpenId(open ? null : s.id)}
              className="flex w-full min-h-[44px] items-center justify-between px-4 py-2.5 text-left font-display text-sm font-medium text-slate-800"
            >
              {s.title}
              <span className="text-slate-400">{open ? "−" : "+"}</span>
            </button>
            {open && <div className="border-t border-slate-100 px-4 py-3">{s.body}</div>}
          </div>
        );
      })}
    </div>
  );
}
