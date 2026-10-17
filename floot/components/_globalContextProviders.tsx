import { ReactNode, useEffect, useState } from "react";
import { Helmet } from "react-helmet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";
import { WindowAppearance } from "@ddibara5/capacitor-window-appearance";
import { ThemeModeProvider, useThemeMode } from "../helpers/themeMode";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";
import { AuthProvider } from "../helpers/useAuth";
import { persistQueryCache, restoreQueryCache } from "../helpers/queryCachePersist";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute "fresh" window
      gcTime: 24 * 60 * 60 * 1000, // keep visited screens in the saved cache between launches
    },
  },
});
if (typeof window !== "undefined") { restoreQueryCache(queryClient); persistQueryCache(queryClient); }

// Tells iOS and other browsers this is an installable web app, so a home screen shortcut opens
// full screen (no Safari address bar or toolbar). Same tags as GameDeck, in Marquee's colors.
function AppHead() {
  const { mode } = useThemeMode();
  const [systemDark, setSystemDark] = useState(() => typeof window !== "undefined" && (window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false));
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) return;
    const update = (event: MediaQueryListEvent) => setSystemDark(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const dark = mode === "dark" || (mode === "auto" && systemDark);
  // iPhone app: UIKit bars, sheets and the keyboard draw in the window's appearance, so the window follows the
  // chosen mode (Light, Dark, Device). Clock and battery icons follow the palette; Capacitor names the BAR,
  // so "DARK" means light icons. Both are no-ops on the web (GameDeck pattern, October 14).
  useEffect(() => {
    if (Capacitor.getPlatform() === "ios" && Capacitor.isPluginAvailable("WindowAppearance")) void WindowAppearance.setStyle({ style: mode === "auto" ? "system" : mode }).catch(() => {});
  }, [mode]);
  useEffect(() => {
    if (Capacitor.isNativePlatform()) void SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }).catch(() => {});
  }, [dark]);
  return <Helmet>
    <link rel="manifest" href="/manifest.json" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-title" content="Marquee" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="theme-color" content={dark ? "#070a12" : "#eef2f7"} />
  </Helmet>;
}

export const GlobalContextProviders = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeModeProvider>
          <AppHead />
          <ScrollToHashElement />
          <TooltipProvider>
            {children}
            <SonnerToaster />
          </TooltipProvider>
        </ThemeModeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
