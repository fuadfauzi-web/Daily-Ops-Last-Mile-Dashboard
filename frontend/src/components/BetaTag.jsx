import { FEATURES } from "../lib/features";

// "Beta" marker next to a tab / page name. With FEATURES.alertTidy (staging trial, design review D11) it is plain small text instead of an amber
// pill, so the only filled badges left in the chrome are the ink count badges (L2) -- a pill reads as an alert, and Beta is not one.
export default function BetaTag() {
  if (FEATURES.alertTidy) return <span className="text-[9px] font-bold uppercase leading-none tracking-wide text-[#92400E]">Beta</span>;
  return <span className="rounded bg-amber-100 px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-amber-800">Beta</span>;
}
