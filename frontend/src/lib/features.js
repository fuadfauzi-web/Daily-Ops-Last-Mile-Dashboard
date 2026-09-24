// PRODUCTION build: staging-only features are off. Which features THIS build actually ships, so the in-app Guide (Admin -> Guide) only
// describes what users can really see. Staging turns everything on; production only
// what has been released to it -- when a feature is released to production, flip its
// flag there (and keep the Guide's text for it up to date; see GuideTab.jsx).
export const FEATURES = {
  // Dashboard
  shipperRadar: false, // "Shipper Radar" (with Restock + Cold Chain sub-tabs) instead of "Shipper Watch" + a separate Restock tab
  stationHealthCombined: false, // one expandable Region > Zone > Station table, no colour scale, CSV export
  completionSummary: false, // Route Monitoring -> Completion Summary
  bucketDetails: false, // Shipment Details buckets show % of Total Fresh and open their tracking numbers
  timingChart: false, // Shipment Details hourly timing chart
  coldChain: false, // Cold Chain tab / sub-tab
  restockBundles: false, // Restock bundle list, Restock On Hold Details, B2B Document Compliance (RDO)
  // People / tools
  roleTesterUser: true, // Role Tester can also view as one specific user
};
