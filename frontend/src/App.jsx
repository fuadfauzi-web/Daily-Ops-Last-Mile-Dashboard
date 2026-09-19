import { useEffect, useState } from "react";
import { api } from "./api";
import Dashboard from "./Dashboard";
import AdminPanel from "./AdminPanel";

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = error
  const [tab, setTab] = useState("dashboard");

  useEffect(() => {
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">Loading…</div>
    );
  }

  if (me === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="rounded-xl bg-white p-6 text-status-critical ring-1 ring-slate-200">
          Couldn't reach the app. Try reloading.
        </div>
      </div>
    );
  }

  if (!me.provisioned) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-sm rounded-xl bg-white p-6 text-center ring-1 ring-slate-200">
          <h1 className="text-lg font-semibold text-slate-900">Access not set up yet</h1>
          <p className="mt-2 text-sm text-slate-600">
            {me.email
              ? `Your account (${me.email}) isn't provisioned for this dashboard yet.`
              : "You're not signed in."}{" "}
            Ask your admin to add you.
          </p>
        </div>
      </div>
    );
  }

  const initials = (me.display_name || me.email || "?")
    .split(/[\s.@]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0].toUpperCase())
    .join("");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b-[3px] border-brand bg-slate-900">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 shrink-0 rounded-sm bg-brand" />
            <h1 className="text-base font-semibold tracking-tight text-white">Daily Ops Last Mile Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            {(me.role === "admin" || me.role === "manager") && (
              <nav className="flex gap-1 rounded-lg bg-slate-800 p-1 text-sm">
                {["dashboard", "admin"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-md px-3 py-1.5 capitalize ${
                      tab === t ? "bg-white font-medium text-slate-900 shadow-sm" : "text-slate-300"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            )}
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-white">{me.display_name || me.email}</div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  {me.role}
                  {me.scope_type !== "all" && ` · ${me.scope_value}`}
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1400px] px-6 py-6">
        {tab === "dashboard" ? <Dashboard me={me} /> : <AdminPanel />}
      </main>
    </div>
  );
}
