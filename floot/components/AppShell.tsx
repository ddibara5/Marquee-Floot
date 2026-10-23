import {shouldHandlePageBack} from "../helpers/shouldHandlePageBack";
import {useRouteRestoration} from "../helpers/useRouteRestoration";
import { PropsWithChildren, type ReactNode, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, UNSAFE_LocationContext, useLocation, useNavigate, useNavigationType, useOutlet } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { nativeNavigationSupported, SEARCH_TAB, useNativeTabBar } from "../helpers/useNativeTabBar";
import { useDialogOpen } from "../helpers/useAppDark";
import NativeHeader, { type NativeHeaderItem } from "./NativeHeader";
import { Bookmark, ChartNoAxesCombined, ChevronLeft, ChevronRight, Home, History, Search, Settings } from "lucide-react";
import { MarqueeMark } from "./MarqueeMark";
import { useTraktAutoSync } from "../helpers/useTraktAutoSync";
import { useAppBack } from "../helpers/useAppBack";
import { usePageGestures } from "../helpers/usePageGestures";
import { nextPageStack, type PageEntry } from "../helpers/pageStack";
import { useMediaQuery } from "../helpers/useMediaQuery";
import AppBackButton from "./AppBackButton";
import { PageErrorBoundary } from "./PageErrorBoundary";
import { useQueryClient } from "@tanstack/react-query";
import { titleEpisodesQuery } from "../helpers/useTitleEpisodes";
import styles from "./AppShell.module.css";

const SIDEBAR_KEY = "marquee-sidebar-collapsed";
const ROOTS = ["/", "/library", "/watchlist", "/insights"];

/** A covered page keeps reading its own location, so nothing in it reacts to the page on top. */
function PageLocation({ location, children }: { location: unknown; children: ReactNode }) {
  const context = useContext(UNSAFE_LocationContext);
  const value = useMemo(() => ({ ...context, location: location as typeof context.location }), [context, location]);
  return <UNSAFE_LocationContext.Provider value={value}>{children}</UNSAFE_LocationContext.Provider>;
}
// Safari in a browser tab owns its own back swipe (Cookbook rule); the app, Home Screen web app and other browsers use ours.
const customSwipe = typeof window !== "undefined" && (() => {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true || Capacitor.isNativePlatform();
  return !ios || standalone;
})();

export default function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const path = location.pathname;
  const subpage = !ROOTS.includes(path);
  // Paths no page claims render the catch-all not-found page, which goes back to Home.
  const known = path.startsWith("/titles/") || path === "/migration-verification";
  const fallback = path === "/sync/review"?"/sync":path === "/settings" ? "/" : path.startsWith("/settings/") || path === "/sync" ? "/settings" : known ? "/library" : "/";
  const title = path === "/settings" ? "Settings" : path === "/settings/appearance" ? "Appearance" :
    path === "/settings/account" ? "Account" : path === "/settings/household" ? "Household access" : path === "/sync" ? "Data & sync" : path === "/sync/review"?"Mapping review": known ? "Title details" : "Page not found";
  const accessibleTitle = path === "/" ? "Home" : path === "/library" ?
    new URLSearchParams(location.search).get("view") === "titles" ? "Titles" : "Activity" :
    path === "/watchlist" ? "Watch List" : path === "/insights" ? "Insights" : title;
  const panelRef = useRef<HTMLDivElement>(null);
  // Desktop sidebar width is a per-device preference, like the theme.
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(SIDEBAR_KEY) === "true"; } catch { return false; } });
  const toggleSidebar = () => setCollapsed(previous => { const next = !previous; try { localStorage.setItem(SIDEBAR_KEY, String(next)); } catch { /* keep in memory */ } return next; });
  const goBack = useAppBack(fallback);
  useRouteRestoration(panelRef);
  // Phone page stack (October 16, from GameDeck): the page under the current one stays mounted, frozen where it was, so a
  // subpage slides in over it and Back or the edge swipe reveals the real page. Off with the sidebar layout.
  const wide = useMediaQuery("(min-width:900px)");
  const stackOn = !wide;
  const navType = useNavigationType(), outlet = useOutlet();
  const mainRef = useRef<HTMLElement>(null);
  const layers = useRef(new Map<string, HTMLElement>());
  const stack = useRef<PageEntry<ReactNode>[]>([]);
  const seenKey = useRef<string | null>(null);
  if (!stackOn) { stack.current = []; seenKey.current = null; }
  else if (seenKey.current !== location.key) {
    const previous = stack.current[stack.current.length - 1];
    if (previous && navType === "PUSH") {
      const box = layers.current.get(previous.key)?.getBoundingClientRect();
      if (box) previous.frame = { top: box.top, left: box.left, width: box.width };
      previous.scrollY = window.scrollY;
    }
    stack.current = nextPageStack(stack.current, { key: location.key, pathname: path, element: outlet, location }, navType);
    seenKey.current = location.key;
  } else if (stack.current.length) {
    const top = stack.current[stack.current.length - 1];
    stack.current[stack.current.length - 1] = { ...top, element: outlet, location };
  }
  const entries = stack.current;
  // Pages are see-through over the fixed sky backdrop, so the motion clips the page underneath instead of painting a background.
  const gestures = usePageGestures({ stack: stackOn, swipe: subpage && customSwipe, routeKey: location.key, panel: mainRef, onBack: goBack, seeThrough: true });
  useLayoutEffect(() => {
    if (!stackOn) return;
    const top = stack.current[stack.current.length - 1];
    if (navType === "POP" && top?.scrollY != null) window.scrollTo({ top: top.scrollY, left: 0, behavior: "instant" as ScrollBehavior });
    // Opening a subpage slides it in over the page it covers (iOS push); main tabs switch instantly.
    if (navType === "PUSH" && stack.current.length > 1 && !ROOTS.includes(path)) {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
      gestures.slideIn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key, stackOn]);
  const back = () => { if (stackOn && entries.length > 1) { gestures.slideBack(); return; } goBack(); };
  useEffect(() => {
    if (!subpage) return;
    const onKey = (event: KeyboardEvent) => { if (shouldHandlePageBack(event)) back(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  // No header Refresh (October 16, GameDeck pattern): Trakt syncs on open when stale, and Settings > Data & sync has Sync now.
  useTraktAutoSync();
  const nav = [
    { to: "/", label: "Home", icon: Home },
    { to: "/library", label: "Activity", icon: History },
    { to: "/watchlist", label: "Watch List", icon: Bookmark },
    { to: "/insights", label: "Insights", icon: ChartNoAxesCombined },
  ];
  const titleSearch = path === "/library" && new URLSearchParams(location.search).get("view") === "titles";
  const navItems = () => nav.map(({ to, label, icon: Icon }) => {
    // Titles search counts as Search, not Activity, matching the iPhone app's tab bar.
    const active = to === "/" ? location.pathname === "/" : location.pathname.startsWith(to) && !(to === "/library" && titleSearch);
    return (
      <Link key={to} to={to} title={label} aria-label={label} aria-current={active ? "page" : undefined} className={active ? styles.active : styles.navLink}>
        <Icon size={20} strokeWidth={2.1} aria-hidden="true" />
        <span>{label}</span>
      </Link>
    );
  });
  const settingsActive = path.startsWith("/settings") || path.startsWith("/sync");
  // Touch-down on a title link starts loading its episodes before the tap lands, so the detail opens complete (October 17, from GameDeck).
  const client = useQueryClient();
  useEffect(() => {
    const down = (event: PointerEvent) => {
      const href = event.target instanceof Element ? event.target.closest("a[href^='/titles/']")?.getAttribute("href") : null;
      const titleId = href ? Number(href.slice("/titles/".length)) : NaN;
      if (Number.isSafeInteger(titleId) && titleId > 0) void client.prefetchQuery(titleEpisodesQuery(titleId));
    };
    document.addEventListener("pointerdown", down, { capture: true, passive: true });
    return () => document.removeEventListener("pointerdown", down, true);
  }, [client]);

  // iPhone app (October 15): native Liquid Glass tab bar and header replace the web bars below 900px.
  // Search titles is iOS 26's detached round search button beside the tabs.
  const navigate = useNavigate();
  const selectedTab = titleSearch ? SEARCH_TAB : path.startsWith("/titles/") ? "/library" : path;
  const dialogOpen = useDialogOpen(nativeNavigationSupported());
  const nativeTabs = useNativeTabBar([...nav.map(({ to, label }) => ({ to, label })), { to: SEARCH_TAB, label: "Search", role: "search" as const }], selectedTab, dialogOpen, subpage);
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
          <Link className={titleSearch ? styles.active : styles.navLink} to="/library?view=titles" title="Search titles" aria-label="Search titles" aria-current={titleSearch ? "page" : undefined}><Search size={20} aria-hidden="true" /><span>Search titles</span></Link>
          <Link className={settingsActive ? styles.active : styles.navLink} to="/settings" title="Settings" aria-label="Settings" aria-current={settingsActive ? "page" : undefined}><Settings size={20} aria-hidden="true" /><span>Settings</span></Link>
        </div>
      </aside>
      <div ref={panelRef} className={`${styles.content} ${subpage ? styles.subpage : ""}`}>
        <header className={styles.header} data-root={!subpage} data-detail={path.startsWith("/titles/") || undefined}>
          <div className={styles.headerSide}>
            {subpage && <AppBackButton fallback={fallback} fallbackLabel={fallback === "/" ? "Home" : fallback === "/settings" ? "Settings" : "Activity"} iconSize={20} onBack={back} />}
          </div>
          {/* Title pages show only Back over the artwork (October 18, GameDeck pattern); the page's own heading names the title. */}
          {subpage ? path.startsWith("/titles/")
            ? <span aria-hidden="true" />
            : <strong className={styles.headerTitle}>{title}</strong> :
            <>
              {/* Text-only brand, like GameDeck (October 17); the ticket mark stays in the desktop sidebar and the app icon. */}
              <Link to="/" className={styles.brand + (path === "/" ? " " + styles.homeBrand : "")}><span>Marquee</span></Link>
              <span className={styles.rootTitle} aria-hidden="true">{accessibleTitle}</span>
            </>}
          <div className={styles.headerActions}>
            <Link className={styles.headerAction + " " + styles.headerSearch} to="/library?view=titles" aria-label="Search titles" title="Search titles"><Search size={20} aria-hidden="true" /></Link>
            <Link className={styles.headerAction} to="/settings" aria-label="Settings" title="Settings"><Settings size={20} aria-hidden="true" /></Link>
          </div>
        </header>
        <main ref={mainRef} className={styles.main + (stackOn && entries.length ? " " + styles.stackMain : "")}>
          {stackOn && entries.length ? <>
            <div className={styles.pageDim} data-page-dim aria-hidden="true" />
            {entries.map((entry, index) => {
              const top = index === entries.length - 1;
              return <section key={entry.key} ref={el => { if (el) layers.current.set(entry.key, el); else layers.current.delete(entry.key); }}
                className={top ? styles.layer : styles.underLayer} data-page-layer={top ? "top" : "under"} data-root={ROOTS.includes(entry.pathname) || undefined}
                inert={!top} aria-hidden={top ? undefined : true}
                style={top || !entry.frame ? undefined : { top: entry.frame.top, left: entry.frame.left, width: entry.frame.width }}>
                <PageLocation location={entry.location}>
                  {top && !path.startsWith("/titles/") && <h1 className={styles.visuallyHidden}>{accessibleTitle}</h1>}
                  <PageErrorBoundary resetKey={entry.key}>{top ? outlet : entry.element}</PageErrorBoundary>
                </PageLocation>
              </section>;
            })}
          </> : <>
            {!path.startsWith("/titles/") && <h1 className={styles.visuallyHidden}>{accessibleTitle}</h1>}
            <PageErrorBoundary resetKey={location.key}>{children}</PageErrorBoundary>
          </>}
        </main>
      </div>
      {!subpage && !nativeTabs && <div className={styles.mobileDock}>
        <nav className={styles.mobileNav} aria-label="Primary mobile">{navItems()}</nav>
        <Link to="/library?view=titles" aria-label="Search titles" aria-current={titleSearch ? "page" : undefined} className={titleSearch ? styles.dockSearchActive : styles.dockSearch}><Search size={22} aria-hidden="true" /></Link>
      </div>}
    </div>
  );
}
