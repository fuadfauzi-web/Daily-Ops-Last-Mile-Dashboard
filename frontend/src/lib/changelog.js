// "What's new" (Guide -> What's new). Every build that changes something a user can see gets
// an entry HERE, at the top, in the same change (2026-09-25 feedback: keep this current).
//
//  * The page only shows entries from the last 7 days (by `date`, yyyy-mm-dd), so old ones
//    drop off by themselves -- no need to delete them, though old entries can be pruned.
//  * `feature` (optional): a key in lib/features.js -- the entry only shows in a build that
//    ships that feature, so production never advertises something it doesn't have yet.
//  * `minRank` (optional): 0 station, 1 region, 2 manager, 3 admin -- only shown to that role
//    and above (a station user isn't told about admin-only tools).
//  * Write for the people using the dashboard: what changed and where to find it.
export const CHANGELOG = [
  {
    date: "2026-09-25",
    title: "Urgent TN: assign a PIC",
    points: [
      "Type a teammate's email (they must already be a dashboard user) when you track a tracking number, with an optional note.",
      "They see a red bell on the Urgent TN tab. They pick In progress (the bell goes quiet for an hour, then reminds them if it isn't closed) or Closed (the bell stays off and it stays on their list marked closed), and can type a reply that you see.",
      "When you close or remove it, it disappears from their list too, whatever its status.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Feedback: replies, attachments, delete",
    points: [
      "Attach a screenshot or PDF (up to 20 MB) to your feedback.",
      "Admins reply and close it; you see the reply under Settings → Feedback, with a red dot on Settings.",
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
      "Find a person with the search box, filter by role, by scope, or tick \"Never opened\" to see who has never used the dashboard.",
      "Click any column header to sort -- for example Last opened.",
      "Edit now jumps straight to the form, and the header stays in view as you scroll.",
    ],
  },
  {
    date: "2026-09-25",
    title: "Filter lists follow your scope",
    points: [
      "The Region, Zone and Station filters now only list places inside your scope -- a station user no longer sees the rest of the network in the dropdowns.",
    ],
  },
  {
    date: "2026-09-25",
    title: "No more page blink every minute",
    points: [
      "Aging Details, RPU and the Restock views used to flash and jump back to the top on each automatic refresh. They now refresh quietly in place.",
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
      "New Cold Chain view (its own tab, and a sub-tab of Shipper Radar): the cold-chain tracking numbers by station and age, with the full TN list. Stations with nothing in them are hidden.",
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
    points: ["Admins can preview the app as any role and scope from the header, without changing their own account."],
  },
  {
    date: "2026-09-24",
    title: "Filters: clear buttons",
    points: ["Multi-select filters no longer show the picked values below the box, and have an always-visible × to clear them."],
  },
  {
    date: "2026-09-24",
    title: "Station Health: one combined table",
    feature: "stationHealthCombined",
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
];

const DAY_MS = 24 * 60 * 60 * 1000;

// Entries from the last `days` days that this build ships and this role may see.
export function recentChanges({ features, rank, days = 7, now = new Date() }) {
  const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - days * DAY_MS;
  return CHANGELOG.filter((e) => {
    const [y, m, d] = e.date.split("-").map(Number);
    if (new Date(y, m - 1, d).getTime() < cutoff) return false;
    if (e.feature && !features[e.feature]) return false;
    if ((e.minRank || 0) > rank) return false;
    return true;
  });
}
