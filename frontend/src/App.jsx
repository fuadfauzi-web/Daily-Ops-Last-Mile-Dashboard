import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { api } from "./api";
import Dashboard, { DASHBOARD_TAB_KEYS } from "./Dashboard";
import SideNav from "./components/SideNav";
import CommandJump from "./components/CommandJump";
import CategoryNav from "./components/CategoryNav";
import BetaTag from "./components/BetaTag";
import { SIDE_ITEMS, taskListBadges } from "./lib/sideNav";
import SettingsPanel from "./SettingsPanel";
import Logo from "./components/Logo";
import BellBadge from "./components/BellBadge";
import { useWhatsNewUnread } from "./lib/whatsNew";
import RoleTester from "./components/RoleTester";
import UserMenu from "./components/UserMenu";
import { useDensity } from "./lib/density";
import { formatTime } from "./lib/format";
import { FEATURES } from "./lib/features";
import { positionLabel } from "./lib/roles";
import KpiDashboard from "./KpiDashboard";
import ManagementViewTab from "./ManagementViewTab";
import StaffDirectoryTab from "./StaffDirectoryTab";
import FleetAdminTab from "./FleetAdminTab";
import AttendanceTab from "./AttendanceTab";

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = error
  const [tab, setTab] = useState("dashboard");
  const [density, setDensity] = useDensity();
  const [menuOpen, setMenuOpen] = useState(false);
  // Reported up by Dashboard once its data loads -- shown here so it's visible
  // the instant the app opens, regardless of which tab/sub-tab is active.
  const [freshness, setFreshness] = useState(null);
  const [stationsInScope, setStationsInScope] = useState(null); // shown as a footnote after "Data as of"

  // Staging sidebar trial (FEATURES.sidebarNav): per-person choice kept in this browser; top tabs stay the default. Only applies from 1024px up --
  // below that the existing top tabs / phone menu are used, since the sidebar has no phone layout yet.
  const [navMode, setNavModeState] = useState(() => {
    try {
      return localStorage.getItem("nav-mode") === "sidebar" ? "sidebar" : "tabs"; // the first paint; replaced by this person's own choice once we know who they are
    } catch {
      return "tabs";
    }
  });
  const setNavMode = (m) => {
    setNavModeState(m);
    try {
      localStorage.setItem("nav-mode", m);
      if (me?.email) localStorage.setItem(`nav-mode:${me.email}`, m); // remembered per person, so two people on one browser each get their own
    } catch {
      /* storage blocked -- the choice just won't persist */
    }
  };
  // Top bar or sidebar is a personal preference: reopen the way this person last chose.
  useEffect(() => {
    if (!me?.email) return;
    try {
      const saved = localStorage.getItem(`nav-mode:${me.email}`) || localStorage.getItem("nav-mode");
      setNavModeState(saved === "sidebar" ? "sidebar" : "tabs");
    } catch {
      /* storage blocked -- keep the default */
    }
  }, [me?.email]);
  const [sideCollapsed, setSideCollapsed] = useState(() => {
    try {
      return localStorage.getItem("side-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const toggleSide = () =>
    setSideCollapsed((c) => {
      try {
        localStorage.setItem("side-collapsed", c ? "0" : "1");
      } catch {
        /* storage blocked */
      }
      return !c;
    });
  const [wide, setWide] = useState(() => (typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : true));
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const on = () => setWide(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  const [dashTab, setDashTab] = useState(null); // the Dashboard's active sub-tab, reported up so the sidebar can highlight it
  const [dashRequest, setDashRequest] = useState(null); // { key, n } -- asks the Dashboard to open a sub-tab
  const [recGroup, setRecGroup] = useState("activemissing"); // which Recovery group the sidebar / category row has selected
  const [jumpOpen, setJumpOpen] = useState(false);
  useEffect(() => {
    if (!FEATURES.jumpSearch) return undefined;
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setJumpOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  // "Copy as image" (staging trial, FEATURES.copyImage): captures <main> as a PNG. A small stamp (page title + "Data as of") is shown inside
  // <main> only while the picture is taken, so the pasted image says what it is and how fresh it is.
  const mainRef = useRef(null);
  const [capturing, setCapturing] = useState(false);
  const [imgState, setImgState] = useState(null); // null | "busy" | "copied" | "saved" | "error"
  const stickyRef = useRef(null);
  const [stickyH, setStickyH] = useState(96);
  useLayoutEffect(() => {
    if (!stickyRef.current) return undefined;
    const el = stickyRef.current;
    const measure = () => setStickyH(Math.round(el.getBoundingClientRect().height));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  });

  const loadMe = () =>
    api
      .me()
      .then(setMe)
      .catch(() => setMe(null));

  useEffect(() => {
    loadMe();
  }, []);

  // Updates in Guide -> What's new the user hasn't read yet (clears once they open it).
  const whatsNewUnread = useWhatsNewUnread(me?.provisioned ? me : null);

  // Bumped whenever the Role Tester applies / exits a view, and used as a React key below so
  // every screen remounts and re-fetches as the new role/scope. Without it the tab you were
  // on kept showing the data it had already loaded as the real admin (2026-09-25 bug: a
  // Manager / East Coast preview still listed every region on Station Health).
  const [viewKey, setViewKey] = useState(0);

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
  const canSeeManagementView = FEATURES.managementView && (me.role === "manager" || me.role === "admin");
  // The Fleet Admin team's own tab (2026-10-02, staging): keeps the staff list and org chart. Admin and managers can open it too.
  const canSeeStaff = true; // the Staff list and org chart are for everyone signed in (2026-10-03); only the Fleet Admin role edits
  // Fleet Admin (2026-10-02, staging): the lists the Fleet Admin team keeps (premises first). HQ staff and above can read; only the Fleet Admin team edits.
  const canSeeFleetAdmin = ["admin", "manager", "hq_staff"].includes(me.role);
  const navTabs = [
    "dashboard",
    // Launch Timeline: a station without a launch date (or more than a day before it) has no Attendance. Until the first notification count arrives only Managers / Superadmin see it.
    ...(FEATURES.attendance && (notifCounts ? notifCounts.attendance_visible !== false : me.role === "admin" || me.role === "manager") ? ["attendance"] : []),
    ...(canSeeManagementView ? ["management"] : []),
    ...(canSeeStaff ? ["staff"] : []),
    ...(canSeeFleetAdmin ? ["fleetadmin"] : []),
    ...(FEATURES.kpiDashboard ? ["kpi"] : []),
    ...(me.role === "admin" || me.role === "manager" || me.role === "region" ? ["users"] : []), // the Users page (was a tab inside Settings)
    ...(me.role === "admin" || me.role === "manager" || me.role === "region" || me.position === "opex" || me.position === "recovery" ? ["settings"] : []), // targets, KPI settings, Recovery settings, Data Refresh -- which tabs inside depends on the role
    "help", // Feedback, Guide, What's new
    ...(me.role === "admin" ? ["admin"] : []),
  ];
  const navLabel = (t) =>
    t === "staff" ? "Staff & Org Chart" : t === "fleetadmin" ? "Fleet Admin" : t === "admin" ? "Superadmin" : t === "kpi" || t === "management" || t === "attendance" ? (
      <span className="inline-flex items-center gap-1.5">
        {t === "kpi" ? "KPI" : t === "attendance" ? "Attendance" : "Management View"}
        <BetaTag />
      </span>
    ) : (
      t
    );

  const tidy = !!FEATURES.headerTidy;
  const sidebarActive = !!FEATURES.sidebarNav && navMode === "sidebar" && wide;
  // "Top tabs" (the default choice) is the same categories as the sidebar laid out along the top; "Classic" is the original tab strips.
  const catActive = !!FEATURES.sidebarNav && navMode === "tabs" && wide;
  const externalNav = sidebarActive || catActive;
  // PDCNR / Damage / No Label from Hub are Beta (2026-10-04): only the Superadmin, Manager / HOD and Recovery see them.
  const canSeeRecLists = me.role === "admin" || me.role === "manager" || me.position === "recovery";
  const sideItems = SIDE_ITEMS.filter((i) => (!i.recLists || canSeeRecLists) && (i.dash ? DASHBOARD_TAB_KEYS.includes(i.dashKey || i.id) : navTabs.includes(i.id))).map((i) => {
    const bells = i.id === "urgent" ? taskListBadges(notifCounts, FEATURES.taskList) : { badge: 0, dot: 0 };
    return {
      ...i,
      label: i.id === "urgent" && FEATURES.taskList ? i.taskListLabel : i.label,
      active: i.dash ? tab === "dashboard" && dashTab === (i.dashKey || i.id) && (!i.recGroup || recGroup === i.recGroup) : tab === i.id,
      badge: i.id === "help" ? (notifCounts?.feedback_replies_unread || 0) + whatsNewUnread : i.id === "attendance" ? (notifCounts?.ptwh_review || 0) + (notifCounts?.ptwh_approvals || 0) + (notifCounts?.ptwh_corrections || 0) : bells.badge,
      dot: bells.dot,
    };
  });
  const jumpToStation = (station) => {
    setTab("dashboard");
    setDashRequest({ key: "health", n: Date.now(), station });
  };
  const copyAsImage = async () => {
    if (!mainRef.current || imgState === "busy") return;
    setImgState("busy");
    setCapturing(true);
    try {
      await new Promise((r) => setTimeout(r, 120)); // let the stamp render before the picture is taken
      const { toBlob } = await import("html-to-image");
      // A picture that never finishes (a hidden tab does that) ends in an error after 20s instead of a button stuck on "Working…".
      const blob = await Promise.race([
        toBlob(mainRef.current, { pixelRatio: 2, backgroundColor: "#f8fafc", cacheBust: true }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 20000)),
      ]);
      if (!blob) throw new Error("no image");
      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([new window.ClipboardItem({ "image/png": blob })]);
        setImgState("copied");
      } else {
        // Browsers without image-clipboard support: download the PNG instead.
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `daily-ops-${new Date().toISOString().slice(0, 10)}.png`;
        a.click();
        URL.revokeObjectURL(url);
        setImgState("saved");
      }
    } catch {
      setImgState("error");
    } finally {
      setCapturing(false);
      setTimeout(() => setImgState(null), 2500);
    }
  };
  const pageTitle = sideItems.find((i) => i.active)?.label || "Daily Ops Last Mile";
  const selectSide = (id) => {
    const item = SIDE_ITEMS.find((i) => i.id === id);
    if (item?.dash) {
      setTab("dashboard");
      if (item.recGroup) setRecGroup(item.recGroup);
      setDashRequest({ key: item.dashKey || id, n: Date.now() });
    } else setTab(id);
  };
  const onRoleChanged = () => {
    setTab("dashboard");
    setViewKey((k) => k + 1);
    loadMe();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="sticky top-0 z-40" ref={stickyRef}>
        {FEATURES.stagingBanner && (
          <div className="bg-amber-400 py-1 text-center font-display text-[11px] font-bold uppercase leading-none tracking-wider text-amber-950">
            Staging
          </div>
        )}
        <header className="border-b-[3px] border-brand bg-white">
        <div className="mx-auto flex max-w-[1920px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex shrink-0 items-center gap-4">
            <Logo />
            <div className={`hidden h-6 w-px bg-slate-200 ${tidy ? "min-[1800px]:block" : "lg:block"}`} />
            <h1 className={`hidden whitespace-nowrap font-display text-sm font-semibold tracking-tight text-ink ${tidy ? "min-[1800px]:block" : "lg:block"}`}>Daily Ops Last Mile</h1>
          </div>

          {/* Desktop chrome: freshness, density toggle, nav, user block all inline.
              headerTidy (staging): the title only shows from 1440px, freshness from 1360px, density from 1200px (below those
              they live in the user menu), the station count only from 1536px, and the Role Tester moves into the user menu. */}
          <div className="hidden min-w-0 flex-1 items-center justify-end gap-3 lg:flex">
            {(tidy || tab === "dashboard") && freshness && (
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
                Data as of {formatTime(freshness)}
                {stationsInScope != null && (
                  <span className="text-[11px] text-slate-400">
                    · {stationsInScope} station{stationsInScope === 1 ? "" : "s"} in scope
                  </span>
                )}
              </div>
            )}
            <div className={`overflow-hidden rounded-lg border border-slate-200 font-display text-[11px] font-semibold ${tidy ? "hidden" : "flex"}`}>
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
            <nav className={`gap-1 rounded-lg bg-slate-100 p-1 text-sm ${externalNav ? "hidden" : "flex"}`}>
              {navTabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 font-display capitalize ${
                    tab === t ? "bg-brand font-medium text-white shadow-sm" : "text-slate-500"
                  }`}
                >
                  {navLabel(t)}
                  {t === "help" && (
                    <BellBadge
                      count={(notifCounts?.feedback_replies_unread || 0) + whatsNewUnread}
                      title="A reply to your feedback, or updates in What's new you haven't read"
                    />
                  )}
                  {t === "attendance" && <BellBadge count={(notifCounts?.ptwh_review || 0) + (notifCounts?.ptwh_approvals || 0) + (notifCounts?.ptwh_corrections || 0)} title="PTWH clocks by QR code to review, and new PTWH hires waiting for your approval" />}
                </button>
              ))}
            </nav>
            {FEATURES.jumpSearch && me.provisioned && (
              <button
                type="button"
                onClick={() => setJumpOpen(true)}
                title="Jump to a page or a station (Ctrl K)"
                aria-label="Jump to a page or a station"
                className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-canvas px-3 text-xs text-muted hover:bg-white"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="8.5" cy="8.5" r="5.5" />
                  <path d="M13 13l4.5 4.5" strokeLinecap="round" />
                </svg>
                <span className={`hidden ${externalNav ? "min-[1440px]:inline" : "min-[1800px]:inline"}`}>Jump to…</span>
                <kbd className={`hidden whitespace-nowrap rounded border border-line bg-white px-1 font-sans text-[10px] text-subtle ${externalNav ? "min-[1440px]:inline" : "min-[1800px]:inline"}`}>Ctrl K</kbd>
              </button>
            )}
            {FEATURES.copyImage && (
              <button
                type="button"
                onClick={copyAsImage}
                title="Copy this page as an image (with its title and Data as of) to paste in Gchat"
                aria-label="Copy this page as an image"
                className="flex min-h-[44px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-line bg-white px-3 text-xs font-medium text-ink-2 hover:bg-canvas"
              >
                <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                  <rect x="2.5" y="5" width="15" height="11" rx="2" />
                  <circle cx="10" cy="10.5" r="2.8" />
                  <path d="M7 5l1-1.8h4L13 5" />
                </svg>
                <span className="hidden min-[1600px]:inline">
                  {imgState === "busy" ? "Working…" : imgState === "copied" ? "Copied!" : imgState === "saved" ? "Saved" : imgState === "error" ? "Couldn't copy" : "Copy as image"}
                </span>
                {imgState && <span className="min-[1600px]:hidden text-[11px] font-semibold">{imgState === "copied" ? "✓" : imgState === "busy" ? "…" : "!"}</span>}
              </button>
            )}
            {catActive && <CategoryNav items={sideItems} onSelect={selectSide} />}
            {tidy ? (
              <UserMenu
                me={me}
                initials={initials}
                freshness={freshness}
                stationsInScope={stationsInScope}
                showFreshness={tab === "dashboard"}
                density={density}
                setDensity={setDensity}
                onRoleChanged={onRoleChanged}
                navMode={FEATURES.sidebarNav ? navMode : undefined}
                setNavMode={setNavMode}
              />
            ) : (
              <>
                <RoleTester me={me} onChanged={onRoleChanged} />
                <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white">
                    {initials}
                  </div>
                  <div className="leading-tight">
                    <div className="text-sm font-medium text-ink">{me.display_name || me.email}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-400">
                      {positionLabel(me.position || me.role)}
                      {me.scope_type !== "all" && ` · ${(me.scope_values || []).join(", ")}`}
                    </div>
                  </div>
                </div>
              </>
            )}
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
                {positionLabel(me.position || me.role)}
                {me.scope_type !== "all" && ` · ${(me.scope_values || []).join(", ")}`}
              </div>
            </div>
            {tab === "dashboard" && freshness && (
              <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                <span className="h-1.5 w-1.5 rounded-full bg-status-good" />
                Data as of {formatTime(freshness)}
                {stationsInScope != null && (
                  <span className="text-[11px] text-slate-400">
                    · {stationsInScope} station{stationsInScope === 1 ? "" : "s"} in scope
                  </span>
                )}
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
                  {navLabel(t)}
                  {t === "help" && (
                    <BellBadge
                      count={(notifCounts?.feedback_replies_unread || 0) + whatsNewUnread}
                      title="A reply to your feedback, or updates in What's new you haven't read"
                    />
                  )}
                  {t === "attendance" && <BellBadge count={(notifCounts?.ptwh_review || 0) + (notifCounts?.ptwh_approvals || 0) + (notifCounts?.ptwh_corrections || 0)} title="PTWH clocks by QR code to review, and new PTWH hires waiting for your approval" />}
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
      </div>
      {FEATURES.jumpSearch && (
        <CommandJump
          open={jumpOpen}
          onClose={() => setJumpOpen(false)}
          pages={sideItems.map((i) => ({ id: i.id, label: i.label, group: i.group }))}
          onPage={selectSide}
          onStation={jumpToStation}
        />
      )}
      <div className={sidebarActive ? "flex" : ""}>
      {sidebarActive && <SideNav items={sideItems} onSelect={selectSide} collapsed={sideCollapsed} onToggle={toggleSide} top={stickyH} />}
      <main ref={mainRef} className={sidebarActive ? "min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6" : "mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-6"}>
        {capturing && (
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2 border-b border-line pb-2">
            <div className="font-display text-lg font-bold text-ink">{pageTitle}</div>
            <div className="text-xs text-muted">
              {freshness ? `Data as of ${formatTime(freshness)}` : ""}
              {stationsInScope != null ? ` · ${stationsInScope} station${stationsInScope === 1 ? "" : "s"} in scope` : ""}
              {" · "}
              {me.display_name || me.email}
            </div>
          </div>
        )}
        {tab === "dashboard" && (
          <Dashboard
            key={`dashboard-${viewKey}`}
            me={me}
            onCapturedAt={setFreshness}
            onStationsInScope={setStationsInScope}
            notifCounts={notifCounts}
            sidebar={externalNav}
            recoveryGroup={recGroup}
            requestedTab={dashRequest}
            onTabState={setDashTab}
          />
        )}
        {tab === "attendance" && FEATURES.attendance && <AttendanceTab key={`attendance-${viewKey}`} me={me} />}
        {tab === "management" && canSeeManagementView && <ManagementViewTab key={`management-${viewKey}`} me={me} />}
        {tab === "staff" && canSeeStaff && <StaffDirectoryTab key={`staff-${viewKey}`} me={me} />}
        {tab === "fleetadmin" && canSeeFleetAdmin && <FleetAdminTab key={`fleetadmin-${viewKey}`} me={me} />}
        {tab === "kpi" && FEATURES.kpiDashboard && <KpiDashboard key={`kpi-${viewKey}`} me={me} />}
        {tab === "users" && <SettingsPanel key={`users-${viewKey}`} me={me} mode="users" notifCounts={notifCounts} />}
        {tab === "settings" && <SettingsPanel key={`settings-${viewKey}`} me={me} mode="settings" notifCounts={notifCounts} />}
        {tab === "help" && <SettingsPanel key={`help-${viewKey}`} me={me} mode="help" notifCounts={notifCounts} />}
        {tab === "admin" && me.role === "admin" && <SettingsPanel key={`admin-${viewKey}`} me={me} mode="admin" />}
      </main>
      </div>
    </div>
  );
}
