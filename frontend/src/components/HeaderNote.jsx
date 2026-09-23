import { useEffect, useRef, useState } from "react";

// A small "ⓘ" button for a table header that pops out an explanation on
// click -- what the metric means, how it's computed, and what to do about it.
// Click-triggered (not hover) so it works the same on a touch device, and
// stays out of the way until someone actually wants it (2026-09-24 feedback).
export default function HeaderNote({ children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  return (
    <span className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] font-normal normal-case leading-none opacity-60 hover:opacity-100"
        aria-label="What this metric means"
      >
        i
      </button>
      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute left-1/2 top-5 z-40 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed text-slate-600 shadow-lg"
        >
          {children}
        </div>
      )}
    </span>
  );
}
