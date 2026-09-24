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
        { role: "Admin", rank: 3, text: `Everything: full user management, all Settings screens, the Admin page (Documents, Data Refresh), replying to feedback${F.roleTester ? " and the Role Tester" : ""}.` },
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
            The <strong>Urgent TN</strong> tab shows a red bell with a number when something needs your attention, and{" "}
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
          Route Monitoring's Current OVFD).
        </p>
        <p>
          The heatmap groups by Region / Zone / Station and colours each cell by whether it breaches the Warning / Critical
          target set in SLA Targets; every column sorts, and "Breaches only" is on by default. "Act on these today" lists the
          worst stations first, each with <strong>Copy TNs</strong> and <strong>Export CSV</strong> grouped by which metric
          flagged them.
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
              The <strong>timing chart</strong> under the table plots scan-in, first-attempt and success times by hour of day.
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
            F.stationHealthCombined ? (
              <>One expandable table that starts at your own scope: a nationwide view opens Region → Zone → Station, a station-scoped view is just your stations. Region and zone-scoped users can hide the region / zone rows with the checkboxes above the table. Cells are coloured only where an SLA target exists (set in SLA Targets). Use Export CSV for what's shown.</>
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
    body: () => (
      <p className="text-sm text-slate-700">
        Missing Details shows open missing-parcel tickets by Region / Zone / Station (Hub / Ship In / Other / Total) plus the
        full TN list with COD value and item description. Rows shaded red are at or above the high-value COD threshold or match
        a high-value keyword{"  "}(both editable in Recovery Settings by an admin or manager).
      </p>
    ),
  },
  {
    id: "shipper",
    title: F.shipperRadar ? "Shipper Radar" : "Shipper Watch",
    body: () => (
      <div className="space-y-2 text-sm text-slate-700">
        <p>
          {F.shipperRadar ? "Shipper SLA is the first sub-tab: " : ""}hypercare metrics for shippers with their own SLA -- Zalora NXD (0 Attempt / OVFD / Other), Amway and Watson
          (0 Attempt, Aging &gt;D0: attempt day 0, succeed before day 3), Orca and Sodaxpress (OVFD vs everything else). Pick the
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
    title: "Urgent TN",
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
              The <strong>PIC</strong> picks <strong>In progress</strong> (acknowledges it: the bell goes quiet, and comes back after 1 hour if it
              still isn't closed) or <strong>Closed</strong> (the bell stays off and the item stays on their list, marked closed). They can also
              type a <strong>Reply</strong> the owner sees.
            </>,
            <>
              The <strong>owner</strong> (whoever added it) sees the PIC's status and reply (the bell tells them when it changes), can change the
              PIC or note, reopen an item the PIC closed, and <strong>Close / remove</strong> it -- which removes it from the PIC's list too,
              whatever its status.
            </>,
            <>
              A tracking number with <strong>no status</strong> ("Not found") is never assigned to a PIC -- it isn't urgent. It stays on
              your own list, and is removed automatically after 3 days if it still has no status (the list shows how many days are left).
            </>,
            <>
              <strong>More than one PIC</strong>: use <strong>Assign another PIC</strong> to give the same tracking number to additional people -- the
              current PIC keeps it. A PIC can also use <strong>Assign to another PIC</strong> to pass it on while keeping their own copy; whoever
              they pick reports back to them. Each assignment is a separate row, and closing or removing one only removes that row.
            </>,
            <>You see the tracking numbers you added and the ones assigned to you.</>,
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
            <><strong>Documents</strong>: upload the driver/rider details CSV that gives Route Monitoring its Tenure column.</>,
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
  { q: "I'm the PIC on a tracking number -- what do I do?", a: "Open the Urgent TN tab. Pick In progress to acknowledge it (the bell stays quiet for an hour and returns if it isn't closed) or Closed when it's done, and use Reply to tell the person who assigned it what's happening." },
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
