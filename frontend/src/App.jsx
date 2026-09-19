import { useEffect, useState } from "react";
import { api } from "./api";
import Dashboard from "./Dashboard";
import AdminPanel from "./AdminPanel";
import Logo from "./components/Logo";
import { useDensity } from "./lib/density";

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = error
  const [tab, setTab] = useState("dashboard");
  const [density, setDensity] = useDensity();
  const [menuOpen, setMenuOpen] = useState(false);

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

  const canSeeAdmin = me.role === "admin" || me.role === "manager" || me.role === "region";

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b-[3px] border-brand bg-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="hidden h-6 w-px bg-slate-200 sm:block" />
            <h1 className="hidden font-display text-sm font-semibold tracking-tight text-ink sm:block">Daily Ops Last Mile</h1>
          </div>

          {/* Desktop chrome: density toggle, nav, user block all inline. */}
          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex overflow-hidden rounded-lg border border-slate-200 font-display text-[11px] font-semibold">
              <button
                onClick={() => setDensity("compact")}
                className={`px-3 py-1 ${density === "compact" ? "bg-ink text-white" : "text-slate-500"}`}
              >
                Compact
              </button>
              <button
                onClick={() => setDensity("comfortable")}
                className={`px-3 py-1 ${density === "comfortable" ? "bg-ink text-white" : "text-slate-500"}`}
              >
                Comfortable
              </button>
            </div>
            {canSeeAdmin && (
              <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
                {["dashboard", "admin"].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`rounded-md px-3 py-1.5 font-display capitalize ${
                      tab === t ? "bg-brand font-medium text-white shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            )}
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-ink">{me.display_name || me.email}</div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  {me.role}
                  {me.scope_type !== "all" && ` · ${me.scope_value}`}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile chrome: just the logo (above) plus this one menu button --
              density toggle and nav move into the dropdown below. */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white sm:hidden"
          >
            {initials}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 sm:hidden">
            <div className="mb-3">
              <div className="text-sm font-medium text-ink">{me.display_name || me.email}</div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                {me.role}
                {me.scope_type !== "all" && ` · ${me.scope_value}`}
              </div>
            </div>
            {canSeeAdmin && (
              <nav className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
                {["dashboard", "admin"].map((t) => (
                  <button
                    key={t}
                    onClick={() => {
                      setTab(t);
                      setMenuOpen(false);
                    }}
                    className={`min-h-[44px] flex-1 rounded-md px-3 py-1.5 font-display capitalize ${
                      tab === t ? "bg-brand font-medium text-white shadow-sm" : "text-slate-500"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </nav>
            )}
            <div className="flex overflow-hidden rounded-lg border border-slate-200 font-display text-[11px] font-semibold">
              <button
                onClick={() => setDensity("compact")}
                className={`min-h-[44px] flex-1 px-3 py-1 ${density === "compact" ? "bg-ink text-white" : "text-slate-500"}`}
              >
                Compact
              </button>
              <button
                onClick={() => setDensity("comfortable")}
                className={`min-h-[44px] flex-1 px-3 py-1 ${density === "comfortable" ? "bg-ink text-white" : "text-slate-500"}`}
              >
                Comfortable
              </button>
            </div>
          </div>
        )}
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-4 sm:px-6 sm:py-6">
        {tab === "dashboard" ? <Dashboard me={me} /> : <AdminPanel me={me} />}
      </main>
    </div>
  );
}
