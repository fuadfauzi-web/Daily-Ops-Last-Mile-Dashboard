import { useState } from "react";

// Single point of change for the Ninja Van mark. Drop the real file in as
// frontend/src/assets/ninjavan-logo.{png,svg,...} and it's picked up with no
// code change here -- the glob just needs a match.
//
// No asset has been supplied yet, so this falls back to a plain brand-red
// square placeholder (today's look) rather than redrawing the logo ourselves.
const logoFiles = import.meta.glob("../assets/ninjavan-logo.*", { eager: true, query: "?url", import: "default" });
const logoSrc = Object.values(logoFiles)[0] || null;

export default function Logo({ className = "h-6 w-6" }) {
  const [failed, setFailed] = useState(false);
  if (!logoSrc || failed) {
    return <div className={`shrink-0 rounded-sm bg-brand ${className}`} />;
  }
  return (
    <img
      src={logoSrc}
      alt="Ninja Van"
      className={`shrink-0 object-contain ${className}`}
      onError={() => setFailed(true)}
    />
  );
}
