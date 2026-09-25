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
    title: "Urgent TN: re-send a note, reply to your PIC",
    points: [
      "Forgot a note when you assigned a tracking number, or something changed? Double-click the Note on the row, edit it and press Send note -- the PIC's bell rings again and the row is tagged UPDATED (only when the text actually changed).",
      "Double-click a PIC Reply to answer it; your answer shows in the new Owner Reply column.",
      "Assign PIC on a tracking number with nobody on it yet fills in that same row. When a PIC passes it on to someone else it is still a new row, so that PIC closes it with the person who passed it on.",
      "The same tracking number on several rows now sits together by default and is colour-coded.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Urgent TN reminders",
    points: [
      "PIC: after you pick In progress the bell stays quiet for an hour, then rings again until you close it -- now only between 8am and 8pm, so nothing rings overnight. Each row shows when the next reminder is.",
      "Whoever added the tracking number now gets a reminder bell at 10am, 2pm and 5pm while any of them is still open (not closed by the PIC, not removed by you). Press Got it on the banner in the Urgent TN tab to quiet it until the next one.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Action Board: arrange the columns",
    points: [
      "With more than one metric picked, drag the metric chips next to the picker (or use their ‹ › arrows) to put the heatmap's columns in the order you want. The order is remembered. Shipper SLA now also counts parcels that are still en-route to the station.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Action Board: notes on every metric",
    points: [
      "Each heatmap column now has a small i: click it for what the metric counts, which parcels it covers, the direction and target, and what to do. Metrics that only cover some parcels -- like Shipper SLA (Amway, Watson, Orca and Cold Chain only) -- say so under the column name.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Shipper Radar: Cold Chain in Shipper SLA",
    points: [
      "Shipper SLA has a new Cold Chain shipper with 0 Attempt and Aging >D0, the same rule as Amway and Watson. Click a number for its tracking numbers.",
    ],
  },
  {
    date: "2026-09-26",
    title: "KPI page: weekly results and RCA for each KPI",
    feature: "kpiDashboard",
    points: [
      "A new KPI page next to Dashboard, built as the RCA side of the KPIs: Weekly Dashboard (every KPI against its target for the past 4 weeks, by region / zone / station), OPEX Result (the OPEX team's result file, to be merged in), and RCA pages for Hybrid Productivity, Invalid POD and COD RTS with the numbers and tracking numbers behind them. The other KPIs are listed as soon.",
      "Admins load the data with Data upload (CSV or Excel -- the right sheet is picked automatically). An uploaded Hybrid file is used instead of Metabase until it is removed.",
      "Trend and bar charts with many points (39 weeks, a month of days) now thin their axis labels and turn crowded bar numbers upright, so nothing overlaps. The Hybrid daily export from Metabase (Route Date: Day) is accepted by Data upload.",
      "Hybrid Productivity: Daily Data (Current Month) always shows the current month whatever View / Period say, Service Duration is filled from the driver list's start date, and every Data upload slot has an Open in Metabase link to download the newest file.",
      "Access: OPEX Result is open to every user in full; the Weekly Dashboard and the RCA pages follow each user's region / zone / station.",
    ],
  },
  {
    date: "2026-09-26",
    title: "DoD (Beta): the dashboard, day by day",
    feature: "dod",
    points: [
      "A new DoD tab, marked Beta because it is still being built (after Shipper Radar; everyone can open it, limited to their own region / zone / station), keeps one snapshot per station per day -- the last refresh before midnight -- for this week and last week, so you can look back at yesterday and compare it with the day before.",
      "Daily View: pick a day and see every region / zone / station with Total Fresh, Fresh Unscan, Latlong, Total 0 Attempt, In Hub, Age >3, Attendance, Total Routed, Success Rate and Pending in Apps, with the change from the day before. Weekly Overview: pick one or more measures and see them across Mon-Sun for this week, last week or both, with one details table that you switch between the measures you picked.",
      "History starts from the first refresh after it went live.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Action Board: Shipper SLA",
    points: [
      "Two new Action Board metrics, Shipper SLA Warning and Shipper SLA Breach, for Amway, Watson, Orca and Cold Chain parcels at the station or still on their way to it: older than 0 days is a warning, older than 1 day is a breach. Copy TNs works on them like the other metrics, and the targets can be changed in SLA Targets.",
    ],
  },
  {
    date: "2026-09-26",
    title: "Station Health: rescue attendance",
    points: [
      "Attendance now shows how many of the drivers are rescue, like Route Monitoring -- for example \"12 (2 Rescue)\". Region and zone rows add their stations up, and Export CSV has a Rescue Attendance column.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Timing chart: % share",
    feature: "timingChart",
    points: [
      "Hover an hour on the Shipment Details timing chart to see its % share as well as the count, and switch Count / % share above the chart to plot each line as a % of its own total.",
    ],
  },
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
      "Everyone who sees region / zone rows -- nationwide, region and zone-scoped users -- can switch them on or off with \"Show region rows\" / \"Show zone rows\" beside Export CSV (remembered for next time; both off gives a flat list of stations).",
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
      "They see a red bell on the Urgent TN tab. They pick In progress (the bell goes quiet for an hour, then rings again if it isn't closed -- 8am to 8pm only) or Closed (the bell stays off and it stays on their list marked closed), and can type a reply that you see.",
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
