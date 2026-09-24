import { useEffect, useRef, useState } from "react";
import { api } from "../api";

const ROLE_LABEL = { station: "Station staff", region: "Region staff", manager: "Manager", admin: "Admin" };

// The Urgent TN "PIC" email box with suggestions: type two or more letters of a name or email and
// pick a dashboard user from the list (2026-09-25 feedback -- no more copying emails from the
// Users page). Still a plain text box: an email typed in full works too, and the server checks
// it against the user list either way.
export default function PicInput({ value, onChange, placeholder, className = "" }) {
  const [options, setOptions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef(null);
  const justPicked = useRef(false); // don't search again for the address we just filled in

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return undefined;
    }
    const q = value.trim();
    if (q.length < 2) {
      setOptions([]);
      return undefined;
    }
    let stale = false;
    const timer = setTimeout(() => {
      api.urgentTn
        .suggest(q)
        .then((res) => {
          if (stale) return;
          setOptions(res);
          setActive(-1);
          setOpen(true);
        })
        .catch(() => {
          if (!stale) setOptions([]);
        });
    }, 200);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const pick = (o) => {
    justPicked.current = true;
    onChange(o.email);
    setOpen(false);
    setOptions([]);
  };

  const onKeyDown = (e) => {
    if (!open || options.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % options.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? options.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      pick(options[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <input
        type="text"
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => options.length > 0 && setOpen(true)}
        onKeyDown={onKeyDown}
      />
      {open && options.length > 0 && (
        <ul className="absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-slate-200">
          {options.map((o, i) => (
            <li key={o.email}>
              <button
                type="button"
                // mousedown, not click: the input's blur would otherwise close the list first
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(o);
                }}
                onMouseEnter={() => setActive(i)}
                className={`flex w-full flex-col px-3 py-1.5 text-left ${i === active ? "bg-slate-100" : ""}`}
              >
                <span className="text-sm font-medium text-slate-800">{o.display_name || o.email}</span>
                <span className="text-xs text-slate-500">
                  {o.display_name ? `${o.email} · ` : ""}
                  {ROLE_LABEL[o.role] || o.role}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
