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
import { positionLabel, registerRoles } from "./lib/roles";
import KpiDashboard from "./KpiDashboard";
import ManagementViewTab from "./ManagementViewTab";
import ManagerDashboardTab from "./ManagerDashboardTab";
import StaffDirectoryTab from "./StaffDirectoryTab";
import FleetAdminTab from "./FleetAdminTab";
import AttendanceTab from "./AttendanceTab";

export default function App() {
  const [me, setMe] = useState(undefined); // undefined = loading, null = error
  const [tabRaw, setTabRaw] = useState("dashboard");
  // The page you were on (and the Recovery group) come back after a refresh / reopen -- remembered per person in this browser.
  const setTab = (t) => {
    setTabRaw(t);
    try {
      if (me?.email) localStorage.setItem(`app-tab:${me.email}`, t);
    } catch {
      /* storage blocked -- it just won't be remembered */
    }
  };
  const [density, setDensity] = useDensity();
  const [menuOpen, setMenuOpen] = useState(false);
  // Reported up by Dashboard once its data loads -- shown here so it's visible
  // the instant the app opens, regardless of which tab/sub-tab is active.
  const [freshness, setFreshness] = useState(null);
  // 2026-10-08: Dashboard reports automatic refresh failures here for a non-blocking header warning.
  const [refreshFailed, setRefreshFailed] = useState(false);
  const [stationsInScope, setStationsInScope] = useState(null); // shown as a footnote after "Data as of"

  // Staging sidebar trial (FEATURES.sidebarNav): per-person choice kept in this browser; top tabs stay the default. Only applies from 1024px up --
  // below that the existing top tabs / phone menu are used, since the sidebar has no phone layout yet.
  const [navMode, setNavModeState] = useState(() => {
    try {
      return localStorage.getItem("nav-mode") === "tabs" ? "tabs" : "sidebar"; // the first paint (the sidebar is the default); replaced by this person's own choice once we know who they are
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
      setNavModeState(saved === "tabs" ? "tabs" : "sidebar");
    } catch {
      /* storage blocked -- keep the default */
    }
  }, [me?.email]);
  // Auto-hide the sidebar once a page is chosen (default on; a personal choice in the user menu)
  const [sideAutoHide, setSideAutoHideRaw] = useState(() => {
    try {
      return localStorage.getItem("side-autohide") !== "0";
    } catch {
      return true;
    }
  });
  const setSideAutoHide = (on) => {
    setSideAutoHideRaw(on);
    try {
      localStorage.setItem("side-autohide", on ? "1" : "0");
    } catch {
      /* storage blocked */
    }
  };
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
  const [recGroup, setRecGroupRaw] = useState("activemissing"); // which Recovery group the sidebar / category row has selected
  const setRecGroup = (g) => {
    setRecGroupRaw(g);
    try {
      if (me?.email) localStorage.setItem(`app-recgroup:${me.email}`, g);
    } catch {
      /* storage blocked */
    }
  };
  useEffect(() => {
    if (!me?.email) return;
    try {
      const t = localStorage.getItem(`app-tab:${me.email}`);
      if (t) setTabRaw(t);
      const g = localStorage.getItem(`app-recgroup:${me.email}`);
      if (g) setRecGroupRaw(g);
    } catch {
      /* storage blocked */
    }
  }, [me?.email]);
  // Role Access (Superadmin): a Dashboard page this role has no access to is never left open (a remembered or default page) -- move to the first one it can open.
  useEffect(() => {
    const acc = me?.access || {};
    if (!dashTab || !Object.keys(acc).length) return;
    const mod = dashTab === "recovery" ? `rec:${recGroup}` : dashTab === "restock" ? recGroup : dashTab;
    if (acc[mod]?.level !== "none") return;
    const recLists = me.role === "admin" || me.role === "manager" || me.position === "recovery";
    const next = SIDE_ITEMS.find((i) => i.dash && DASHBOARD_TAB_KEYS.includes(i.dashKey || i.id) && acc[i.id]?.level !== "none" && (!i.recLists || recLists));
    if (!next) return;
    if (next.recGroup) setRecGroup(next.recGroup);
    setDashRequest({ key: next.dashKey || next.id, n: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashTab, recGroup, me?.access]);
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
      .then(async (m) => {
        // custom roles (Superadmin -> Access Setting) join the built-in ones before anything renders a role name
        if (m?.provisioned) await api.roles().then(registerRoles).catch(() => {});
        setMe(m);
      })
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
  const access = me.access || {}; // Superadmin -> Role Access: this role's overrides, module -> { level: "none" | "view", scope_type, scope_values }
  const canSeeManagementView = FEATURES.managementView && (me.role === "manager" || me.role === "admin");
  // Manager Dashboard (2026-10-08): HOD and Fleet Manager only (the Superadmin too); a Manager sees their own region.
  const canSeeManagerDash = FEATURES.managerDashboard && (me.role === "manager" || me.role === "admin");
  // The Fleet Admin team's own tab (2026-10-02, staging): keeps the staff list and org chart. Admin and managers can open it too.
  const canSeeStaff = !!FEATURES.staffDirectory; // the Staff list and org chart are for everyone signed in (2026-10-03); only the Fleet Admin role edits
  // Fleet Admin (2026-10-02, staging): the lists the Fleet Admin team keeps (premises first). HQ staff and above can read; only the Fleet Admin team edits.
  const canSeeFleetAdmin = !!FEATURES.fleetAdmin && ["admin", "manager", "hq_staff"].includes(me.role);
  const navTabs = [
    "dashboard",
    // Launch Timeline: a station without a launch date (or more than a day before it) has no Attendance. Until the first notification count arrives only Managers / Superadmin see it.
    ...(FEATURES.attendance && (notifCounts ? notifCounts.attendance_visible !== false : me.role === "admin" || me.role === "manager") ? ["attendance"] : []),
    ...(canSeeManagementView ? ["management"] : []),
    ...(canSeeManagerDash ? ["managerDash"] : []),
    ...(canSeeStaff ? ["staff"] : []),
    ...(canSeeFleetAdmin ? ["fleetadmin"] : []),
    ...(FEATURES.kpiDashboard ? ["kpi"] : []),
    ...(me.role === "admin" || me.role === "manager" || me.role === "region" ? ["users"] : []), // the Users page (was a tab inside Settings)
    ...(me.role === "admin" || me.role === "manager" || me.role === "region" || me.position === "opex" || me.position === "recovery" ? ["settings"] : []), // targets, KPI settings, Recovery settings, Data Refresh -- which tabs inside depends on the role
    "help", // Feedback, Guide, What's new
    ...(me.role === "admin" ? ["admin"] : []),
  ].filter((t) => access[t]?.level !== "none"); // a page the Superadmin switched off for this role is not in the menu
  const tab = navTabs.includes(tabRaw) ? tabRaw : "dashboard";
  const navLabel = (t) =>
    t === "managerDash" ? <span className="inline-flex items-center gap-1.5">Manager Dashboard<BetaTag /></span> : t === "staff" ? "Staff & Org Chart" : t === "fleetadmin" ? <span className="inline-flex items-center gap-1.5">Fleet Admin<BetaTag /></span> : t === "admin" ? "Superadmin" : t === "kpi" || t === "management" || t === "attendance" ? (
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
  const canSeeRecLists = !!FEATURES.recoveryBeta && (me.role === "admin" || me.role === "manager" || me.position === "recovery");
  const sideItems = SIDE_ITEMS.filter((i) => (!i.recLists || canSeeRecLists) && access[i.id]?.level !== "none" && (i.dash ? DASHBOARD_TAB_KEYS.includes(i.dashKey || i.id) : navTabs.includes(i.id))).map((i) => {
    const bells = i.id === "urgent" ? taskListBadges(notifCounts, FEATURES.taskList) : { badge: 0, dot: 0 };
    return {
      ...i,
      label: i.id === "urgent" && FEATURES.taskList ? i.taskListLabel : i.label,
      active: i.dash ? tab === "dashboard" && dashTab === (i.dashKey || i.id) && (!i.recGroup || recGroup === i.recGroup) : tab === i.id,
      badge: i.id === "admin" ? notifCounts?.documents_stale || 0 : i.id === "help" ? (notifCounts?.feedback_replies_unread || 0) + whatsNewUnread : i.id === "attendance" ? (notifCounts?.ptwh_review || 0) + (notifCounts?.ptwh_approvals || 0) + (notifCounts?.ptwh_corrections || 0) + (notifCounts?.staff_flags || 0) + (notifCounts?.hybrid_flags || 0) : bells.badge,
      dot: bells.dot,
    };
  });
  // the module the open page belongs to (lib/sideNav.js ids), for the "view only" note
  const currentModule = tab !== "dashboard" ? tab : dashTab === "recovery" ? `rec:${recGroup}` : dashTab === "restock" ? recGroup : dashTab;
  const viewOnly = access[currentModule]?.level === "view" ? SIDE_ITEMS.find((i) => i.id === currentModule)?.label || "this page" : null;
  const jumpToStation = (station) => {
    setTab("dashboard");
    setDashRequest({ key: "health", n: Date.now(), station });
  };
  const selectSide = (id) => {
    const item = SIDE_ITEMS.find((i) => i.id === id);
    if (item?.dash) {
      setTab("dashboard");
      if (item.recGroup) setRecGroup(item.recGroup);
      setDashRequest({ key: item.dashKey || id, n: Date.now() });
    } else setTab(id);
  };
  const onRoleChanged = () => {
    try {
      Object.keys(sessionStorage).filter((k) => k.startsWith("dash-filter:")).forEach((k) => sessionStorage.removeItem(k));
    } catch {
      /* storage blocked */
    }
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
        <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex shrink-0 items-center gap-4">
            <Logo />
            {/* Data as of sits right after the logo, in both the sidebar and the top-bar layouts */}
            {freshness && (
              <div className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap text-xs text-slate-500 lg:flex">
                <span className={`h-1.5 w-1.5 rounded-full ${refreshFailed ? "bg-status-warning" : "bg-status-good"}`} />
                {refreshFailed ? `Refresh failed — showing last successful data: ${formatTime(freshness)}` : `Data as of ${formatTime(freshness)}`}
                {stationsInScope != null && (
                  <span className="text-[11px] text-slate-400">
                    · {stationsInScope} station{stationsInScope === 1 ? "" : "s"} in scope
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Desktop chrome after the logo and Data as of: the categories (top-bar layout), then search + the user menu on the right. */}
          <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
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
                  {t === "attendance" && <BellBadge count={(notifCounts?.ptwh_review || 0) + (notifCounts?.ptwh_approvals || 0) + (notifCounts?.ptwh_corrections || 0) + (notifCounts?.staff_flags || 0) + (notifCounts?.hybrid_flags || 0)} title="PTWH clocks by QR code to review, and new PTWH hires waiting for your approval" />}
                </button>
              ))}
            </nav>
            {catActive && <CategoryNav items={sideItems} onSelect={selectSide} />}
            <div className="flex-1" />
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
                sideAutoHide={sideAutoHide}
                setSideAutoHide={setSideAutoHide}
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
            className="ml-auto flex h-11 w-11 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white lg:hidden"
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
                <span className={`h-1.5 w-1.5 rounded-full ${refreshFailed ? "bg-status-warning" : "bg-status-good"}`} />
                {refreshFailed ? `Refresh failed — showing last successful data: ${formatTime(freshness)}` : `Data as of ${formatTime(freshness)}`}
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
                  {t === "attendance" && <BellBadge count={(notifCounts?.ptwh_review || 0) + (notifCounts?.ptwh_approvals || 0) + (notifCounts?.ptwh_corrections || 0) + (notifCounts?.staff_flags || 0) + (notifCounts?.hybrid_flags || 0)} title="PTWH clocks by QR code to review, and new PTWH hires waiting for your approval" />}
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
      {sidebarActive && <SideNav items={sideItems} onSelect={selectSide} collapsed={sideCollapsed} onToggle={toggleSide} top={stickyH} autoHide={sideAutoHide} />}
      <main className={sidebarActive ? "min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6" : "mx-auto max-w-[1920px] px-4 py-4 sm:px-6 sm:py-6"}>
        {viewOnly && (
          <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-200">
            View only -- your role can look at {viewOnly} but not change anything there (set by the Superadmin under Role Access).
          </div>
        )}
        {tab === "dashboard" && (
          <Dashboard
            key={`dashboard-${viewKey}`}
            me={me}
            onCapturedAt={setFreshness}
            onStationsInScope={setStationsInScope}
            onRefreshStatus={setRefreshFailed}
            notifCounts={notifCounts}
            sidebar={externalNav}
            recoveryGroup={recGroup}
            requestedTab={dashRequest}
            onTabState={setDashTab}
          />
        )}
        {tab === "attendance" && FEATURES.attendance && <AttendanceTab key={`attendance-${viewKey}`} me={me} />}
        {tab === "management" && canSeeManagementView && <ManagementViewTab key={`management-${viewKey}`} me={me} />}
        {tab === "managerDash" && canSeeManagerDash && <ManagerDashboardTab key={`managerDash-${viewKey}`} me={me} />}
        {tab === "staff" && canSeeStaff && <StaffDirectoryTab key={`staff-${viewKey}`} me={me} />}
        {tab === "fleetadmin" && canSeeFleetAdmin && <FleetAdminTab key={`fleetadmin-${viewKey}`} me={me} />}
        {tab === "kpi" && FEATURES.kpiDashboard && <KpiDashboard key={`kpi-${viewKey}`} me={me} />}
        {tab === "users" && <SettingsPanel key={`users-${viewKey}`} me={me} mode="users" notifCounts={notifCounts} />}
        {tab === "settings" && <SettingsPanel key={`settings-${viewKey}`} me={me} mode="settings" notifCounts={notifCounts} />}
        {tab === "help" && <SettingsPanel key={`help-${viewKey}`} me={me} mode="help" notifCounts={notifCounts} />}
        {tab === "admin" && me.role === "admin" && <SettingsPanel key={`admin-${viewKey}`} me={me} mode="admin" notifCounts={notifCounts} />}
      </main>
      </div>
    </div>
  );
}
