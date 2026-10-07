// Which features THIS build actually ships, so the in-app Guide (Superadmin -> Guide) only
// describes what users can really see. Staging turns everything on; production only
// what has been released to it -- when a feature is released to production, flip its
// flag there (and keep the Guide's text for it up to date; see GuideTab.jsx).
export const FEATURES = {
  // Dashboard
  shipperRadar: true, // "Shipper Radar" (with Restock + Cold Chain sub-tabs) instead of "Shipper Watch" + a separate Restock tab
  stationHealthCombined: true, // one expandable Region > Zone > Station table, no colour scale, CSV export
  completionSummary: true, // Route Monitoring -> Completion Summary
  bucketDetails: true, // Shipment Details buckets show % of Total Fresh and open their tracking numbers
  timingChart: true, // Shipment Details hourly timing chart
  coldChain: true, // Cold Chain tab / sub-tab
  restockBundles: true, // Restock bundle list, Restock On Hold Details, B2B Document Compliance (RDO)
  kpiDashboard: true, // "KPI" page (Beta -- preview only, not to be used until the green light): weekly results, OPEX result, RCA for Hybrid / Invalid POD / COD RTS
  dod: true, // "DoD" tab (Beta): Station Health day by day for this week + last week; every role, limited to its own scope
  managementView: true, // "Management View" tab (Beta, staging-only for now): higher-level rollup for managers/admins -- Overall health, Capacity, Backlog radar
  managerDashboard: true, // "Manager Dashboard" tab (Beta, HOD + Fleet Manager only): Station Capacity + Driver Strength of their region (plan figures typed in), and a private workspace (links, due dates, notes)
  processingTime: true, // "Processing Time" tab (Beta, staging-only for now): the past 7 days of hour-of-day timelines per station
  dailyKpi: true, // "Daily KPI" tab (Beta -- numbers not 100% accurate yet, says so in-app): today's FIFO D0 / Prior / Completion D0, how many parcels left to attempt or deliver
  attendance: true, // "Attendance" page (Beta, staging-only for now): PTWH clock in / out, month sheet and payable first; Staff and Hybrid attendance come later
  stationProfile: true, // "Station profile" view inside Staff & Org Chart (staging-only for now, OFF in production): one station's IDs, address, people, boxes and postcodes, like the Fleet Management sheet's Station tab
  // People / tools
  taskList: true, // "Task List" tab: Urgent TN + Email / Gchat + To Do List + Task Assigned
  hideSummaryCards: true, // the Region / Zone / TOTAL LAST MILE summary cards above the filters are removed
  roleTester: true, // admin Role Tester in the header (preview a role / scope)
  roleTesterUser: true, // ...and view as one specific user
  headerTidy: true, // staging-only trial (2026-10-02 design review): header fits one row at 1280px -- title/freshness/density hide at narrower widths, user block + Role Tester become one menu. NOT approved for production yet.
  healthTable: true, // staging-only trial (2026-10-02 design review D5): Station Health under 9 column-group headers with short labels, a target line per column, tinted severity cells, column-group chooser. NOT approved for production yet.
  boardViews: true, // staging-only trial (2026-10-02 design review D9): Action Board searchable grouped metric picker, numbered chips, "My views" saved per person in the browser, tinted badges only on breaching cells. NOT approved for production yet.
  sidebarNav: true, // staging-only trial (2026-10-02 design review D3): a grouped left sidebar as an OPTION (user menu -> Navigation). Top tabs stay the default. NOT approved for production yet.
  jumpSearch: true, // staging-only trial (2026-10-02 design review D4): Ctrl/Cmd+K (or the magnifier in the header) jumps to a page or a station. NOT approved for production yet.
  detailPanel: true, // staging-only trial (2026-10-02 design review D6): the station detail panel lists metrics under the 9 group headings, says how many are flagged, and can copy / CSV the flagged tracking numbers. NOT approved for production yet.
  filterBar: true, // staging-only trial (2026-10-02 design review D8): the filter bar gets an uppercase FILTERS label, 36px controls and a grey "your scope" chip for people with nothing to pick. NOT approved for production yet.
  alertTidy: true, // staging-only trial (2026-10-02 design review D11): "Beta" becomes small text instead of an amber pill, and the bell badge is an ink count badge instead of red. NOT approved for production yet.
  phoneTnSheet: true, // staging-only trial (2026-10-02 design review D10): on a phone (<768px) the tracking-number lists open as a full-screen sheet with a sticky top bar, 56px rows and a Copy list / CSV bottom bar. NOT approved for production yet.
  chartStyle: true, // staging-only trial (2026-10-02 design review D13): charts use ink for the main series and grey for comparison (brand red stays chrome-only), paler gridlines, and a dashed target line where a chart is given one. NOT approved for production yet.
  headlineCards: true, // staging-only trial (2026-10-03 design review D7): Station Health opens with a strip of headline cards (Fresh, Routed, 0 Attempt, In Hub, Age >3) with the change since yesterday. NOT approved for production yet.
  stagingBanner: true, // a sticky orange "STAGING" strip above the header -- staging-only forever, never turn on in production (it IS the this-is-staging signal)
};
