// "What's new" (Guide -> What's new). Every build that changes something a user can see gets
// an entry HERE, at the top, in the same change (2026-09-25 feedback: keep this current).
//
//  * The page is a WEEKLY summary: entries are grouped into Monday-Sunday weeks by `date`
//    (yyyy-mm-dd); the current week is shown first and older weeks stay collapsed behind
//    "Show earlier weeks". Nothing needs deleting -- a new entry just lands in the current week.
//  * `feature` (optional): a key in lib/features.js -- the entry only shows in a build that
//    ships that feature, so production never advertises something it doesn't have yet.
//  * `minRank` (optional): 0 station, 1 region, 2 manager, 3 admin -- only shown to that role
//    and above (a station user isn't told about admin-only tools).
//  * `wide` (optional): only shown to someone whose scope covers more than one station (a
//    station-scoped user is never told about region / zone level features they can't use).
//  So "What's new" only ever lists what applies to the viewer's role AND scope.
//  * Write for the people using the dashboard: what changed and where to find it.
//  * IMPORTANT CHANGES ONLY (2026-09-25 feedback): new features, changed behaviour, things that
//    affect what someone sees or can do. Do NOT log cosmetic tweaks -- a moved box, spacing, text
//    size, wording, a small fix nobody would notice.
export const CHANGELOG = [
  {
    date: "2026-09-25",
    title: "A bell for What's new",
    points: [
      "A red bell shows on Settings (and on Guide → What's new) when there are updates you haven't read. It clears as soon as you open What's new, and updates you haven't seen yet are tagged NEW.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Station Health follows your scope",
    feature: "stationHealthCombined",
    points: [
      "The table starts at your own level: a station-scoped user sees just their stations, a zone-scoped user their zones and stations, a region-scoped user their regions, zones and stations.",
      "Region and zone-scoped users can switch the region / zone rows on or off with \"Show region rows\" / \"Show zone rows\" (remembered for next time).",
    ],
  },
  {
    date: "2026-09-25",
    title: "Task List: Email / Gchat, To Do List and Task Assigned",
    feature: "taskList",
    points: [
      "The Urgent TN tab is now the Task List, with four sub-tabs: Urgent TN, Email / Gchat, To Do List and Task Assigned. Each has its own bell.",
      "Email / Gchat: list the emails and chats you want to follow up, with a due date, and assign a PIC (another user, picked from suggestions as you type) to help reply or remind you.",
      "Task Assigned: give a task to one or more other users; each updates their own status and replies.",
      "Due dates can have an optional time, and an EOD button sets \"before 7pm today\".",
      "Reminders: an open item due within 2 days (or overdue) rings the bell at 10am, 2pm and 5pm every day; later ones ring once a day at 2pm. Press \"got it\" to quiet one until the next time.",
      "To Do List: your own tracker with due dates, progress and optional reminders.",
      "A small amber dot on the tab and sub-tab shows when something of yours -- including tasks you assigned to others -- is due within 2 days or overdue.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Summary cards removed",
    feature: "hideSummaryCards",
    points: [
      "The Region / Zone and TOTAL LAST MILE summary cards above the filters are gone -- the filters and the tables below work as before.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Urgent TN: assign a PIC",
    points: [
      "Start typing a teammate's name or email when you track a tracking number and pick them from the suggestions (they must already be a dashboard user), with an optional note.",
      "They see a red bell on the Urgent TN tab. They pick In progress (the bell goes quiet for an hour, then reminds them if it isn't closed) or Closed (the bell stays off and it stays on their list marked closed), and can type a reply that you see.",
      "You can assign the same tracking number to several PICs (\"Assign another PIC\") without touching the ones who already have it, and a PIC can pass it on to someone else while keeping their own copy.",
      "When you close or remove it, it disappears from their list too, whatever its status. You can tick several tracking numbers and remove them all at once.",
      "A tracking number with no status (not found) is never assigned to a PIC -- there's nothing to chase. It stays on your own list and is removed automatically after 1 day if it still has no status.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Feedback: replies, attachments, delete",
    points: [
      "Attach a screenshot or PDF (up to 20 MB) to your feedback.",
      "Admins reply and close it; you see the reply under Settings → Feedback, with a red bell on Settings.",
      "You can delete your own feedback whenever you like (it disappears for the admins too). Closed feedback is deleted automatically a week after it's closed.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Settings and Admin reorganised",
    points: [
      "Feedback and Guide now live under Settings, so every role can reach them.",
      "The Admin page is for admins only and holds Documents and Data Refresh -- the settings only an admin can change.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Guide: search, common questions and this page",
    points: [
      "Search the guide, read the common questions, or ask the admins a question that's answered under Settings → Feedback.",
      "The guide now only shows what applies to your role and scope.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Users list: find, filter and sort",
    minRank: 1,
    points: [
      "Find a person with the search box, filter by role, by scope type (Everything / Region / Zone / Station) and a searchable scope, or tick \"Never opened\" to see who has never used the dashboard.",
      "Click any column header to sort -- for example Last opened.",
      "Edit now jumps straight to the form, and the header stays in view as you scroll.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Filter lists follow your scope",
    wide: true,
    points: [
      "The Region, Zone and Station filters now only list places inside your scope -- a station user no longer sees the rest of the network in the dropdowns.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Role Tester: view as one specific user",
    minRank: 3,
    feature: "roleTesterUser",
    points: ["Besides previewing a role and scope, you can now act as a single user to test things tied to a person (their Urgent TN list, bell and feedback)."],
  },
  {
    date: "2026-09-25",
    title: "Cold Chain",
    feature: "coldChain",
    points: [
      "New Cold Chain view (a sub-tab of Shipper Radar): the cold-chain tracking numbers by station and age, with the full TN list. Stations with nothing in them are hidden.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Restock: bundle list, On Hold Details and B2B Document Compliance",
    feature: "restockBundles",
    points: [
      "Restock NXD now has Restock On Hold and Restock Incomplete columns and a bundle-level tracking-number list (filter by flag, with an Attempt column).",
      "Restock On Hold Details lists bundles that are on hold or missing pieces, with a column for every flag.",
      "B2B Document Compliance (RDO) has Pickup Fail and Age, and every count opens its tracking numbers with a CSV. Only the 143 stations are counted.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Timing chart: its own filters",
    feature: "timingChart",
    wide: true,
    points: ["The Shipment Details timing chart has its own Region / Zone / Station filters and now draws scan-in, first attempt and success in one chart."],
  },
  {
    date: "2026-09-24",
    title: "Shipment Details: scan-in duration",
    points: [
      "Within 1h / 1-2h / 2-3h / 3h+ measure the time from the shipment arriving (column G) to the first scan-in (column H). Process Time was removed.",
    ],
  },
  {
    date: "2026-09-24",
    title: "Shipment Details: % of Total Fresh and tracking numbers",
    feature: "bucketDetails",
    points: ["Each duration bucket also shows its % of Total Fresh (the column sorts by that %) and opens its tracking numbers with a CSV when you click it."],
  },
  {
    date: "2026-09-24",
    title: "Column notes",
    points: [
      "Station Health, Route Monitoring and Shipment Details headers have a small i -- click it for how the number is worked out and what to do about it.",
    ],
  },
  {
    date: "2026-09-24",
    title: "Role Tester",
    minRank: 3,
    feature: "roleTester",
    points: ["Admins can preview the app as any role and scope from the header, without changing their own account."],
  },
  {
    date: "2026-09-24",
    title: "Station Health: one combined table",
    feature: "stationHealthCombined",
    wide: true,
    points: ["Region → Zone → Station in one expandable table, without the colour scale, with CSV export and click-for-tracking-numbers."],
  },
  {
    date: "2026-09-24",
    title: "Completion Summary",
    feature: "completionSummary",
    points: ["Route Monitoring has a Completion Summary: drivers who still haven't cleared their route, worst first, with a Copy for WhatsApp button."],
  },
  {
    date: "2026-09-24",
    title: "Shipper Radar",
    feature: "shipperRadar",
    points: ["Shipper Watch is now Shipper Radar, with Restock as a sub-tab."],
  },
  {
    date: "2026-09-23",
    title: "Route Monitoring: driver types",
    points: [
      "Tick more than one driver type: Hybrid, Independent, OPS, Other or Rescue. A driver routing away from their home station counts as Rescue.",
    ],
  },
  {
    date: "2026-09-23",
    title: "Action Board",
    points: [
      "Sortable heatmap, a Fresh Unscan metric, a metric picker where you can tick several, and a Breaches-only default. Region and Zone rows name the stations that are breaching.",
    ],
  },
  {
    date: "2026-09-23",
    title: "Filters on every tracking-number table",
    points: [
      "Every tracking-number table has station and status multi-select filters. RPU can be filtered by several shippers, statuses and failure reasons.",
    ],
  },
  {
    date: "2026-09-23",
    title: "Refresh every 15 minutes, and Data Refresh detail",
    points: ["The dashboard refreshes every 15 minutes again and is more stable; the app no longer runs out of memory during a refresh."],
  },
  {
    date: "2026-09-23",
    title: "Data Refresh: each query's own time",
    minRank: 3,
    points: ["Admin → Data Refresh shows when each Redash query was last pulled."],
  },
  {
    date: "2026-09-21",
    title: "Users can have several regions, zones or stations",
    minRank: 1,
    points: ["Settings → Users can give one person more than one region, zone or station."],
  },
  {
    date: "2026-09-20",
    title: "Redesigned dashboard",
    points: [
      "New Ninja Van look, the Action Board as the landing tab, sticky table headers, CSV export on every table and a slide-over with every column when you click a row.",
      "Warning / Critical targets (SLA Targets) now drive the colours on Station Health and the Action Board.",
    ],
  },
  {
    date: "2026-09-20",
    title: "New tabs: Recovery, Urgent TN, Pending in Yesterday Route, Restock",
    points: [
      "Recovery lists open missing-parcel tickets with high-value highlighting; Urgent TN tracks tracking numbers you care about; Pending in Yesterday Route is a snapshot taken at ~12:30am; Restock NXD watches restock bundles.",
    ],
  },
  {
    date: "2026-09-20",
    title: "Guide, Feedback and driver tenure",
    points: [
      "An in-app Guide and a Feedback form for everyone.",
      "Route Monitoring can show driver tenure once an admin uploads the driver details file.",
      "Every tracking-number table has its own station search box.",
    ],
  },
  {
    date: "2026-09-19",
    title: "Nationwide, with more views",
    points: [
      "The dashboard covers all 143 stations (East Malaysia can be toggled out) with Shipment Details, Route Monitoring, Shipper Watch, Aging Details, RPU and Old Route views.",
      "Managers and Region staff can add teammates, singly or in bulk from a CSV file.",
    ],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;

function mondayOf(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // back to Monday
  return x;
}

const fmt = (d) => d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });

// Weeks (Monday-Sunday), newest first, each with the entries this build ships and this role
// may see. The current week is always first, even when nothing has changed in it yet.
export function weeklyChanges({ features, rank, wide = true, now = new Date() }) {
  const byWeek = new Map();
  const thisMonday = mondayOf(now);
  byWeek.set(thisMonday.getTime(), []);
  for (const e of CHANGELOG) {
    if (e.feature && !features[e.feature]) continue;
    if ((e.minRank || 0) > rank) continue;
    if (e.wide && !wide) continue;
    const [y, m, d] = e.date.split("-").map(Number);
    const key = mondayOf(new Date(y, m - 1, d)).getTime();
    if (!byWeek.has(key)) byWeek.set(key, []);
    byWeek.get(key).push(e);
  }
  return [...byWeek.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([key, items]) => {
      const start = new Date(key);
      const end = new Date(key + 6 * DAY_MS);
      const weeksAgo = Math.round((thisMonday.getTime() - key) / (7 * DAY_MS));
      return {
        key,
        items,
        range: `${fmt(start)} – ${fmt(end)}`,
        label: weeksAgo === 0 ? "This week" : weeksAgo === 1 ? "Last week" : `Week of ${fmt(start)}`,
      };
    });
}
