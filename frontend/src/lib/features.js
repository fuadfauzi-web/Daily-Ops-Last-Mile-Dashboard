// PRODUCTION build: what is switched off here is staging-only. Which features THIS build actually ships, so the in-app Guide (Admin -> Guide) only
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
  kpiDashboard: true, // "KPI" page (Beta -- preview only, not to be used until the green light): weekly results, OPEX result, RCA for Hybrid / Invalid POD / COD RTS
  dod: true, // "DoD" tab (Beta): Station Health day by day for this week + last week; every role, limited to its own scope
  restockBundles: true, // Restock bundle list, Restock On Hold Details, B2B Document Compliance (RDO)
  // People / tools
  taskList: true, // "Task List" tab: Urgent TN + Email / Gchat + Task Assigned + To Do List
  hideSummaryCards: false, // the Region / Zone / TOTAL LAST MILE summary cards above the filters are removed
  roleTester: false, // admin Role Tester in the header (preview a role / scope)
  roleTesterUser: false, // ...and view as one specific user
};
