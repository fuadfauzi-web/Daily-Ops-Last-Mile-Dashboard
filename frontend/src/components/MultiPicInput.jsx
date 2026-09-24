import { useState } from "react";
import PicInput from "./PicInput";

// Pick one or more dashboard users: type a name or email, choose a suggestion (or press Enter / Add
// for a full email) and each choice becomes a chip you can remove -- used by Task Assigned to give a
// task to several people at once (2026-09-25 feedback). `value` is the list of emails.
export default function MultiPicInput({ value, onChange, placeholder }) {
  const [text, setText] = useState("");

  const add = (email) => {
    const e = (email || "").trim();
    if (!e) return;
    if (!value.some((v) => v.toLowerCase() === e.toLowerCase())) onChange([...value, e]);
    setText("");
  };

  return (
    <div>
      {value.length > 0 && (
        <div className="mb-1.5 flex flex-wrap gap-1.5">
          {value.map((e) => (
            <span key={e} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-xs font-medium text-slate-700">
              {e}
              <button
                type="button"
                onClick={() => onChange(value.filter((v) => v !== e))}
                aria-label={`Remove ${e}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex items-start gap-2">
        <PicInput
          className="flex-1"
          placeholder={value.length ? "Add another person…" : placeholder}
          value={text}
          onChange={setText}
          onPick={(o) => add(o.email)}
          onEnter={() => add(text)}
        />
        <button
          type="button"
          onClick={() => add(text)}
          disabled={!text.trim()}
          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </div>
  );
}
