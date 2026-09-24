import { useMemo, useState } from "react";
import { api } from "./api";

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
          the whole app refreshes together every 15 minutes, so this one timestamp covers everything except Urgent TN
          (see below) and Pending in Yesterday Route (captured once daily at ~12:30am, see Route Monitoring).
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
          <strong>Within 1h / 1-2h / 2-3h / 3h+</strong>: how long each parcel took from the shipment arriving at the
          station (column G) to its first scan-in there (column H). Each shows the count and its % of Total Fresh, sorts
          by that %, and opens its tracking numbers (with CSV) when clicked.
        </li>
        <li>
          The <strong>timing chart</strong> under the table plots scan-in, first-attempt and success times by hour of
          day. It follows the table's filters until you pick its own Region / Zone / Station filter, which then
          overrides them.
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
    title: "Route Monitoring",
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
    id: "coldchain",
    title: "Cold Chain",
    body: (
      <p className="text-sm text-slate-700">
        Aging Overall, but only for the cold-chain tracking numbers (Redash query 1410): a station x age-bucket pivot and
        the full TN list, grouped by where each parcel physically is. Cold-chain parcels often sit at CC hubs that
        aren't stations; those show as their own "Other hubs" rows so nothing is hidden. A cold-chain TN that isn't
        found in the active dataset is already completed or added to a shipment.
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
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          <strong>Restock NXD</strong>: Bundles / Pieces / Potential Breach / Breach by station, counted by bundle
          ("Pieces" is the actual parcel count), with the bundle-level tracking-number list underneath.
        </p>
        <p>
          <strong>On Hold / MPS Incomplete</strong>: bundles that are on hold and/or missing pieces. <em>MPS
          incomplete</em> means fewer pieces are here than the bundle's piece count (for example -001 and -002 have
          arrived but -003 hasn't). <em>Complete but on hold</em> means every piece is here yet one is still On Hold,
          so the hold can be released. This rule is provisional -- tell us if a bundle is flagged wrongly.
        </p>
        <p>
          <strong>B2B Document Compliance</strong> (RDO for now): RDO tracking numbers by station and RDO status
          (Pending Pickup, Van En-route to Pickup, En-route to Sorting Hub, Pickup Fail), grouped by where the bundle
          last swept. Bundles of every status are included, completed or not; hubs that aren't one of our stations show
          as "Other hubs". Click a count for its tracking numbers and a CSV with the bundle details.
        </p>
      </div>
    ),
  },
  {
    id: "urgent",
    title: "Urgent TN",
    body: (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          Paste one or more tracking numbers you want to keep an eye on. It looks them up against the same data
          Station Health refreshes every 15 minutes (not a live search); "Not found" means the parcel is already
          completed or added to a shipment.
        </p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <strong>Assign a PIC</strong>: type a teammate's email (they must already be in the user list) and an optional
            note. They get a bell notification in the header and a banner on the dashboard, and see it marked NEW.
          </li>
          <li>
            Either of you can <strong>Close</strong> or <strong>Reopen</strong> it. Only whoever added it can change the
            PIC or note, or <strong>Remove</strong> it -- removing it takes it off the PIC's list too, whatever its status.
          </li>
          <li>You see the tracking numbers you added and the ones assigned to you.</li>
        </ul>
      </div>
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
          <li>
            <strong>Feedback</strong>: send a complaint, bug report, question or idea straight to the admin team, with an
            optional screenshot or PDF (up to 20 MB). Only you and the admins can see it. Admins reply and close it;
            you'll see the reply here and a bell notification. You can delete your own feedback at any time, and closed
            feedback is deleted automatically a week after it's closed.
          </li>
          <li><strong>Guide</strong>: this page.</li>
        </ul>
      </div>
    ),
  },
];

// Quick answers to the questions people ask most (2026-09-25). Searchable; anything
// not covered here can be sent to the admins as a question, which lands in
// Admin -> Feedback with a "[Question]" prefix so the answer comes back there.
const FAQS = [
  { q: "How often does the data refresh?", a: "Every 15 minutes. The \"Data as of\" time in the header is when everything was last pulled from Redash. Settings -> Data Refresh (admin) shows each query's own last pull time." },
  { q: "Why does a tracking number show \"Not found\" in Urgent TN?", a: "Urgent TN looks parcels up in the same active dataset Station Health uses. A parcel that's already completed or added to a shipment is no longer in it." },
  { q: "Why can't I see another station's numbers?", a: "Your scope (set by an admin in Settings -> Users) limits every tab, filter list and tracking-number list to your own station(s), zone(s) or region(s). Ask your admin if your scope should be wider." },
  { q: "How do I assign a tracking number to a colleague?", a: "Urgent TN tab -> paste the tracking numbers, type your colleague's email in the PIC box (they must already be a dashboard user) and press Track & assign. They'll get a bell notification." },
  { q: "What does Completion Rate mean?", a: "(Total Routed - Current OVFD) / Total Routed. 100% means nothing is still on the vehicle. The target is 100%." },
  { q: "What is the difference between Age >3 and Aging Details?", a: "Station Health's Age >3 leaves out On Hold and On Vehicle for Delivery parcels (the actionable ones). Aging Details includes everything sitting in the hub by age." },
  { q: "Why is East Malaysia hidden?", a: "East Malaysia is Retail, not Last Mile, so it's off by default. Users with a wide enough scope can switch \"Include East Malaysia\" on." },
  { q: "How do I export tracking numbers?", a: "Click any coloured count to open its tracking numbers, then Export CSV (or Copy list). Every table also has its own Export CSV for exactly what's on screen." },
  { q: "My numbers look different from Redash.", a: "The dashboard groups parcels by where they physically are (last scan hub), not their intended destination, unless a column's note says otherwise. Click a header's note (the small i) for the exact rule, then send us a question if it still doesn't match." },
  { q: "How do I change someone's access?", a: "Settings -> Users -> Edit. You can only grant a role and scope at or below your own. Region staff can edit Station staff and give them more than one station." },
];

export default function GuideTab() {
  const [openId, setOpenId] = useState(SECTIONS[0].id);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const q = query.trim().toLowerCase();
  const faqs = useMemo(() => (q ? FAQS.filter((f) => `${f.q} ${f.a}`.toLowerCase().includes(q)) : FAQS), [q]);
  const sections = useMemo(() => (q ? SECTIONS.filter((s) => s.title.toLowerCase().includes(q)) : SECTIONS), [q]);

  const ask = async () => {
    if (!question.trim()) return;
    setSending(true);
    setError(null);
    try {
      await api.feedback.submit(`[Question] ${question.trim()}`);
      setQuestion("");
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
        <div className="font-display text-sm font-semibold text-slate-800">How to use this dashboard</div>
        <p className="mt-1 text-sm text-slate-500">
          A quick reference for new users -- what each role sees, what each tab is for, and the logic behind the
          less-obvious columns. Search below, or click a section to expand it.
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
            It goes to the admins as feedback marked [Question]; their reply appears in Admin → Feedback and you'll get a
            bell notification.
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
            {sent && <span className="text-xs text-status-good">Sent — watch Admin → Feedback for the reply.</span>}
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
            {open && <div className="border-t border-slate-100 px-4 py-3">{s.body}</div>}
          </div>
        );
      })}
    </div>
  );
}
