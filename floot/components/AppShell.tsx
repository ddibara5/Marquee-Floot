import {shouldHandlePageBack} from "../helpers/shouldHandlePageBack";
import {useRouteRestoration} from "../helpers/useRouteRestoration";
import { PropsWithChildren, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { NativeNavigation } from "@capgo/capacitor-native-navigation";
import { nativeNavigationSupported, SEARCH_TAB, useNativeTabBar } from "../helpers/useNativeTabBar";
import { useDialogOpen } from "../helpers/useAppDark";
import NativeHeader, { type NativeHeaderItem } from "./NativeHeader";
import { Bookmark, ChartNoAxesCombined, ChevronLeft, ChevronRight, Home, History, Search, Settings } from "lucide-react";
import { MarqueeMark } from "./MarqueeMark";
import { useTraktAutoSync } from "../helpers/useTraktAutoSync";
import { useAppBack } from "../helpers/useAppBack";
import { useEdgeSwipeBack } from "../helpers/useEdgeSwipeBack";
import AppBackButton from "./AppBackButton";
import styles from "./AppShell.module.css";

const SIDEBAR_KEY = "marquee-sidebar-collapsed";
// Tapped Back in the iPhone app: snapshot slide, a touch quicker than the plugin's 350 ms default (GameDeck, Cookbook).
const BACK_SLIDE_MS = 280;

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
  // No header Refresh (October 16, GameDeck pattern): Trakt syncs on open when stale, and Settings > Data & sync has Sync now.
  useTraktAutoSync();
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

  // iPhone app (October 15): native Liquid Glass tab bar and header replace the web bars below 900px.
  // Search titles is iOS 26's detached round search button beside the tabs.
  const navigate = useNavigate();
  const titleSearch = path === "/library" && new URLSearchParams(location.search).get("view") === "titles";
  const selectedTab = titleSearch ? SEARCH_TAB : path.startsWith("/titles/") ? "/library" : path;
  const dialogOpen = useDialogOpen(nativeNavigationSupported());
  const nativeTabs = useNativeTabBar([...nav.map(({ to, label }) => ({ to, label })), { to: SEARCH_TAB, label: "Search", role: "search" as const }], selectedTab, dialogOpen, subpage);
  const back = () => {
    if (!nativeTabs) { goBack(); return; }
    void (async () => {
      try { await NativeNavigation.beginTransition({ direction: "back", duration: BACK_SLIDE_MS }); } catch { goBack(); return; }
      goBack();
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)));
      await NativeNavigation.finishTransition({ direction: "back", duration: BACK_SLIDE_MS }).catch(() => {});
    })();
  };
  // Main tabs keep the left free for the Home brand: Settings sits on the right.
  const nativeLeft: NativeHeaderItem[] = subpage ? [{ id: "back", title: "Back", symbol: "chevron.backward" }] : [];
  const nativeRight: NativeHeaderItem[] = subpage ? [] : [{ id: "settings", title: "Settings", symbol: "gearshape" }];
  const nativeAction = (id: string) => id === "back" ? back() : id === "settings" ? navigate("/settings") : undefined;

  return (
    <div className={`${styles.shell} ${collapsed ? styles.collapsed : ""} ${nativeTabs ? styles.nativeTabs : ""}`}>
      {/* Main tabs are named by the tab bar, subpages by the native title; title details show the poster instead. */}
      <div className={styles.backdrop} aria-hidden="true"><span className={styles.glow} /><span className={styles.floor} /></div>
      {nativeTabs && <NativeHeader title={subpage && !path.startsWith("/titles/") ? title : ""} left={nativeLeft} right={nativeRight} hidden={dialogOpen} onAction={nativeAction} />}
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
        <header className={styles.header} data-root={!subpage}>
          <div className={styles.headerSide}>
            {subpage && <AppBackButton fallback={fallback} fallbackLabel={fallback === "/" ? "Home" : fallback === "/settings" ? "Settings" : "Activity"} iconSize={20} />}
          </div>
          {subpage ? <strong className={styles.headerTitle}>{title}</strong> :
            <>
              <Link to="/" className={styles.brand + (path === "/" ? " " + styles.homeBrand : "")}><span className={styles.brandMark}><MarqueeMark size={25} /></span><span>Marquee</span></Link>
              <span className={styles.rootTitle} aria-hidden="true">{accessibleTitle}</span>
            </>}
          <div className={styles.headerActions}>
            <Link className={styles.headerAction} to="/library?view=titles" aria-label="Search titles" title="Search titles"><Search size={20} aria-hidden="true" /></Link>
            <Link className={styles.headerAction} to="/settings" aria-label="Settings" title="Settings"><Settings size={20} aria-hidden="true" /></Link>
          </div>
        </header>
        <main className={styles.main}>
          {!path.startsWith("/titles/") && <h1 className={styles.visuallyHidden}>{accessibleTitle}</h1>}
          {children}
        </main>
      </div>
      {!subpage && !nativeTabs && <nav className={styles.mobileNav} aria-label="Primary mobile">{navItems()}</nav>}
    </div>
  );
}
