import { useState } from "react";

// Single point of change for the Ninja Van mark. Drop the real file in as
// frontend/src/assets/ninjavan-logo.{png,svg,...} and it's picked up with no
// code change here -- the glob just needs a match.
//
// No asset has been supplied yet, so this falls back to a plain brand-red
// square placeholder (today's look) rather than redrawing the logo ourselves.
const logoFiles = import.meta.glob("../assets/ninjavan-logo.*", { eager: true, query: "?url", import: "default" });
const logoSrc = Object.values(logoFiles)[0] || null;

// heightClass sizes the real (wide) wordmark by height only, width auto, so its
// aspect ratio is never squashed. The fallback has no real aspect ratio to keep,
// so it gets an explicit square size instead.
export default function Logo({ heightClass = "h-7", fallbackSize = "h-7 w-7" }) {
  const [failed, setFailed] = useState(false);
  if (!logoSrc || failed) {
    return <div className={`shrink-0 rounded-sm bg-brand ${fallbackSize}`} />;
  }
  return (
    <img
      src={logoSrc}
      alt="Ninja Van"
      className={`shrink-0 w-auto ${heightClass}`}
      onError={() => setFailed(true)}
    />
  );
}
