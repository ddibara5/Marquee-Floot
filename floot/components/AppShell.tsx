import {shouldHandlePageBack} from "../helpers/shouldHandlePageBack";
import {useRouteRestoration} from "../helpers/useRouteRestoration";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { Bookmark, ChartNoAxesCombined, ChevronLeft, ChevronRight, Home, History, RefreshCw, Search, Settings } from "lucide-react";
import { MarqueeMark } from "./MarqueeMark";
import { useTraktAutoSync } from "../helpers/useTraktAutoSync";
import { useTraktStatus } from "../helpers/useTraktStatus";
import { syncTrakt } from "../endpoints/trakt-sync_POST.schema";
import { useAppBack } from "../helpers/useAppBack";
import { useEdgeSwipeBack } from "../helpers/useEdgeSwipeBack";
import AppBackButton from "./AppBackButton";
import styles from "./AppShell.module.css";

const SIDEBAR_KEY = "marquee-sidebar-collapsed";

export default function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const path = location.pathname;
  const subpage = !["/", "/library", "/watchlist", "/insights"].includes(path);
  // Paths no page claims render the catch-all not-found page, which goes back to Home.
  const known = path.startsWith("/titles/") || path === "/migration-verification";
  const fallback = path === "/sync/review"?"/sync":path === "/settings" ? "/" : path.startsWith("/settings/") || path === "/sync" ? "/settings" : known ? "/library" : "/";
  const title = path === "/settings" ? "Settings" : path === "/settings/appearance" ? "Appearance" :
    path === "/settings/account" ? "Account" : path === "/sync" ? "Data & sync" : path === "/sync/review"?"Mapping review": known ? "Title details" : "Page not found";
  const accessibleTitle = path === "/" ? "Home" : path === "/library" ?
    new URLSearchParams(location.search).get("view") === "titles" ? "Titles" : "Activity" :
    path === "/watchlist" ? "Watch List" : path === "/insights" ? "Insights" : title;
  const panelRef = useRef<HTMLDivElement>(null);
  const client = useQueryClient();
  const trakt = useTraktStatus();
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState("");
  // Desktop sidebar width is a per-device preference, like the theme.
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(SIDEBAR_KEY) === "true"; } catch { return false; } });
  const toggleSidebar = () => setCollapsed(previous => { const next = !previous; try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* keep in memory */ } return next; });
  const goBack = useAppBack(fallback);
  useRouteRestoration(panelRef);
  useEdgeSwipeBack(subpage, goBack, panelRef, path);
  useEffect(() => {
    if (!subpage) return;
    const onKey = (event: KeyboardEvent) => { if (shouldHandlePageBack(event)) goBack(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [subpage, goBack]);
  useTraktAutoSync();
  useEffect(() => setRefreshError(""), [path]);
  const refreshTab = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRefreshError("");
    try {
      const status = trakt.data ?? (await trakt.refetch()).data;
      if (status?.connected) await syncTrakt();
      await client.invalidateQueries({ queryKey: ["marquee"], refetchType: "active" }, { throwOnError: true });
    } catch (error) {
      setRefreshError(error instanceof Error ? error.message : "Refresh failed. Try again.");
    } finally {
      setRefreshing(false);
    }
  };
  const nav = [
    { to: "/", label: "Home", icon: Home },
    { to: "/library", label: "Activity", icon: History },
    { to: "/watchlist", label: "Watch List", icon: Bookmark },
    { to: "/insights", label: "Insights", icon: ChartNoAxesCombined },
  ];
  const navItems = () => nav.map(({ to, label, icon: Icon }) => {
    const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to);
    return (
      <Link key={to} to={to} title={label} aria-label={label} aria-current={active ? "page" : undefined} className={active ? styles.active : styles.navLink}>
        <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  });
  const settingsActive = path.startsWith("/settings") || path.startsWith("/sync");

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""}`}>
      <aside className={styles.sidebar} aria-label="Sidebar navigation">
        <div className={styles.sidebarTop}>
          <Link className={styles.sidebarBrand} to="/" title="Marquee"><span className={styles.sidebarMark}><MarqueeMark size={34} /></span><span className={styles.sidebarName}>Marquee</span></Link>
          <button type="button" className={styles.collapse} onClick={toggleSidebar} aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight size={19} aria-hidden="true" /> : <ChevronLeft size={19} aria-hidden="true" />}
          </button>
        </div>
        <nav className={styles.sidebarNav} aria-label="Primary desktop">{navItems()}</nav>
        <div className={styles.sidebarBottom}>
          <Link className={styles.navLink} to="/library?view=titles" title="Search titles" aria-label="Search titles"><Search size={20} aria-hidden="true" /><span>Search titles</span></Link>
          <Link className={settingsActive ? styles.active : styles.navLink} to="/settings" title="Settings" aria-label="Settings" aria-current={settingsActive ? "page" : undefined}><Settings size={20} aria-hidden="true" /><span>Settings</span></Link>
        </div>
      </aside>
      <div ref={panelRef} className={`${styles.content} ${subpage ? styles.subpage : ""}`}>
        <header className={styles.header}>
          <div className={styles.headerSide}>
            {subpage ? <AppBackButton fallback={fallback} fallbackLabel={fallback === "/" ? "Home" : fallback === "/settings" ? "Settings" : "Activity"} iconSize={20} /> :
              <button type="button" className={styles.refreshButton} onClick={() => void refreshTab()}
                disabled={refreshing} aria-busy={refreshing} aria-label={"Refresh " + accessibleTitle} title={"Refresh " + accessibleTitle}>
                <span className={refreshing ? styles.refreshSpin : undefined}><RefreshCw size={20} aria-hidden="true" /></span>
              </button>}
            {!subpage && <span className={styles.visuallyHidden} role="status">{refreshing ? "Refreshing " + accessibleTitle : ""}</span>}
          </div>
          {subpage ? <strong className={styles.headerTitle}>{title}</strong> :
            <>
              <Link to="/" className={styles.brand}><span className={styles.brandMark}><MarqueeMark size={26} /></span><span>Marquee</span></Link>
              <span className={styles.rootTitle} aria-hidden="true">{accessibleTitle}</span>
            </>}
          <div className={styles.headerActions}>
            <Link className={styles.headerAction} to="/library?view=titles" aria-label="Search titles" title="Search titles"><Search size={20} aria-hidden="true" /></Link>
            <Link className={styles.headerAction} to="/settings" aria-label="Settings" title="Settings"><Settings size={20} aria-hidden="true" /></Link>
          </div>
        </header>
        <main className={styles.main}>
          {!path.startsWith("/titles/") && <h1 className={styles.visuallyHidden}>{accessibleTitle}</h1>}
          {!subpage && refreshError && <p role="alert" className={styles.refreshError}>Couldn’t refresh data: {refreshError}</p>}
          {children}
        </main>
      </div>
      {!subpage && <nav className={styles.mobileNav} aria-label="Primary mobile">{navItems()}</nav>}
    </div>
  );
}
