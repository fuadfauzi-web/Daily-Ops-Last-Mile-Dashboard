import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// A styled hover tooltip (staging trial, design review) -- white card, ink title, same shadow/ring as the other popovers -- instead of the browser's
// plain black `title` box. Rendered through a portal in fixed viewport coordinates, because the Station Health header sits inside a scrollable table
// that would clip a normal absolute popover. `content` is any JSX; it closes on scroll / leave.
export default function HoverTip({ content, children }) {
  const [pos, setPos] = useState(null);
  const ref = useRef(null);

  useEffect(() => {
    if (!pos) return undefined;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);

  const show = () => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const half = 144; // half of the 288px card, so a header near either edge doesn't push it off-screen
    const left = Math.min(Math.max(r.left + r.width / 2, half + 8), window.innerWidth - half - 8);
    setPos({ top: r.bottom + 8, left });
  };

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={() => setPos(null)} className="inline-block">
        {children}
      </span>
      {pos &&
        createPortal(
          <div
            role="tooltip"
            style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
            className="pointer-events-none fixed z-[70] w-72 rounded-[10px] bg-white p-3 text-left font-sans text-xs font-normal normal-case leading-relaxed tracking-normal text-ink-2 shadow-lg ring-1 ring-line"
          >
            {content}
          </div>,
          document.body
        )}
    </>
  );
}
