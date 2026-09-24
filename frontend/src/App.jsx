import { useEffect, useState } from "react";
import { api } from "./api";
import Dashboard from "./Dashboard";
import SettingsPanel from "./SettingsPanel";
import Logo from "./components/Logo";
import RoleTester from "./components/RoleTester";
import { useDensity } from "./lib/density";
import { formatTime } from "./lib/format";

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = error
  const [tab, setTab] = useState("dashboard");
  const [density, setDensity] = useDensity();
  const [menuOpen, setMenuOpen] = useState(false);
  // Reported up by Dashboard once its data loads -- shown here so it's visible
  // the instant the app opens, regardless of which tab/sub-tab is active.
  const [freshness, setFreshness] = useState(null);

  const loadMe = () =>
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null));

  useEffect(loadMe, []);

  // Header bell + dashboard banner (2026-09-25): Urgent TNs assigned to this user
  // and unread admin replies to their feedback. Polled every minute, and
  // refreshed at once when other parts of the app fire "notifications-changed".
  const [notifCounts, setNotifCounts] = useState(null);
  const provisioned = !!me?.provisioned;
  useEffect(() => {
    if (!provisioned) return undefined;
    const load = () =>
      api
        .notifications()
        .then(setNotifCounts)
        .catch(() => {
          /* the bell just keeps its last numbers */
        });
    load();
    const timer = setInterval(load, 60000);
    window.addEventListener("notifications-changed", load);
    return () => {
      clearInterval(timer);
      window.removeEventListener("notifications-changed", load);
    };
  }, [provisioned]);

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

  // Settings holds what every role may reach (Users for admin/manager/region, SLA Targets and
  // Recovery Settings for admin/manager, plus Feedback and Guide for everyone); Admin is
  // admin-only (Documents, Data Refresh) -- 2026-09-25 feedback. Each tab inside applies its
  // own role checks (see SettingsPanel.jsx's SETTINGS_TABS).
  const navTabs = ["dashboard", "settings", ...(me.role === "admin" ? ["admin"] : [])];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-40 border-b-[3px] border-brand bg-white">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Logo />
            <div className="hidden h-6 w-px bg-slate-200 lg:block" />
            <h1 className="hidden font-display text-sm font-semibold tracking-tight text-ink lg:block">Daily Ops Last Mile</h1>
          </div>

          {/* Desktop chrome: freshness, density toggle, nav, user block all inline. */}
          <div className="hidden items-center gap-3 lg:flex">
            {tab === "dashboard" && freshness && (
              <div className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
                Data as of {formatTime(freshness)}
              </div>
            )}
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
            <nav className="flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
              {navTabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 font-display capitalize ${
                    tab === t ? "bg-brand font-medium text-white shadow-sm" : "text-slate-500"
                  }`}
                >
                  {t}
                  {t === "settings" && (notifCounts?.feedback_replies_unread || 0) > 0 && (
                    <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-status-critical align-middle" title="New reply to your feedback" />
                  )}
                </button>
              ))}
            </nav>
            <RoleTester
              me={me}
              onChanged={() => {
                setTab("dashboard");
                loadMe();
              }}
            />
            <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                {initials}
              </div>
              <div className="leading-tight">
                <div className="text-sm font-medium text-ink">{me.display_name || me.email}</div>
                <div className="text-xs uppercase tracking-wide text-slate-400">
                  {me.role}
                  {me.scope_type !== "all" && ` · ${(me.scope_values || []).join(", ")}`}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile chrome: just the logo (above) plus this one menu button --
              density toggle and nav move into the dropdown below. */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Menu"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white lg:hidden"
          >
            {initials}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 lg:hidden">
            <div className="mb-3">
              <div className="text-sm font-medium text-ink">{me.display_name || me.email}</div>
              <div className="text-xs uppercase tracking-wide text-slate-400">
                {me.role}
                {me.scope_type !== "all" && ` · ${(me.scope_values || []).join(", ")}`}
              </div>
            </div>
            {tab === "dashboard" && freshness && (
              <div className="mb-3 flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
                Data as of {formatTime(freshness)}
              </div>
            )}
            <nav className="mb-3 flex gap-1 rounded-lg bg-slate-100 p-1 text-sm">
              {navTabs.map((t) => (
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
                  {t === "settings" && (notifCounts?.feedback_replies_unread || 0) > 0 && (
                    <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-status-critical align-middle" title="New reply to your feedback" />
                  )}
                </button>
              ))}
            </nav>
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
      <main className="mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-6">
        {tab === "dashboard" && <Dashboard me={me} onCapturedAt={setFreshness} notifCounts={notifCounts} />}
        {tab === "settings" && <SettingsPanel key="settings" me={me} mode="settings" notifCounts={notifCounts} />}
        {tab === "admin" && me.role === "admin" && <SettingsPanel key="admin" me={me} mode="admin" />}
      </main>
    </div>
  );
}
