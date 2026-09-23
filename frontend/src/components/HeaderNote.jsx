import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A small "ⓘ" button for a table header that pops out an explanation on
// click -- what the metric means, how it's computed, and what to do about it.
// Click-triggered (not hover) so it works the same on a touch device, and
// stays out of the way until someone actually wants it (2026-09-24 feedback).
//
// Rendered through a portal into document.body, positioned in fixed viewport
// coordinates computed from the trigger's own bounding rect -- the header
// sits inside a scrollable table (see DataTable's overflow-auto wrapper),
// and a plain position:absolute popover gets clipped at that container's
// edge no matter its z-index. Closes on scroll rather than tracking live
// position, since this is a brief look-up, not a persistent panel.
export default function HeaderNote({ children }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onDocClick = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) close();
    };
    document.addEventListener("mousedown", onDocClick);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  const POPOVER_WIDTH = 256; // matches w-64 below

  const toggle = (e) => {
    e.stopPropagation();
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      // Centered under the icon by default, clamped so a header near either
      // edge of the screen doesn't push the box off-screen.
      const half = POPOVER_WIDTH / 2;
      const center = Math.min(Math.max(r.left + r.width / 2, half + 8), window.innerWidth - half - 8);
      setPos({ top: r.bottom + 6, left: center });
    }
    setOpen((o) => !o);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="ml-1 inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-current text-[9px] font-normal normal-case leading-none opacity-60 hover:opacity-100"
        aria-label="What this metric means"
      >
        i
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
            className="fixed z-50 w-64 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs font-normal normal-case leading-relaxed text-slate-600 shadow-lg"
          >
            {children}
          </div>,
          document.body
        )}
    </>
  );
}
