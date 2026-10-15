import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from "react";

export type ThemeMode = "light" | "dark" | "auto";

// Event mechanism to sync standalone functions with React Context
type ThemeChangeListener = (mode: ThemeMode) => void;
const listeners = new Set<ThemeChangeListener>();

function notifyThemeChange() {
  const mode = getCurrentThemeMode();
  listeners.forEach((listener) => listener(mode));
}

function subscribeToThemeChange(listener: ThemeChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateTheme(darkPreferred: boolean): void {
  if (darkPreferred) {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

const STORAGE_KEY = "marquee-theme-mode";

let currentMediaQuery: MediaQueryList | null = null;

/**
 * Switch to dark mode by adding the "dark" class to document.body.
 */
export function switchToDarkMode(): void {
  // Clear any auto mode listener if present.
  if (currentMediaQuery) {
    currentMediaQuery.onchange = null;
    currentMediaQuery = null;
  }
  document.body.classList.add("dark");
  localStorage.setItem(STORAGE_KEY, "dark");
  notifyThemeChange();
}

/**
 * Switch to light mode by removing the "dark" class from document.body.
 */
export function switchToLightMode(): void {
  // Clear any auto mode listener if present.
  if (currentMediaQuery) {
    currentMediaQuery.onchange = null;
    currentMediaQuery = null;
  }
  document.body.classList.remove("dark");
  localStorage.setItem(STORAGE_KEY, "light");
  notifyThemeChange();
}

/**
 * Switch to auto mode. This function immediately applies the user's color scheme preference
 * and listens for system preference changes to update the theme automatically.
 * It uses the onchange property instead of addEventListener to avoid TypeScript issues.
 */
export function switchToAutoMode(): void {
  if (currentMediaQuery) {
    currentMediaQuery.onchange = null;
  }
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.onchange = (e: MediaQueryListEvent) => {
    updateTheme(e.matches);
  };
  currentMediaQuery = mediaQuery;
  localStorage.setItem(STORAGE_KEY, "auto");
  updateTheme(mediaQuery.matches);
  notifyThemeChange();
}

/**
 * Returns the current theme mode:
 * - "auto" if auto mode is enabled,
 * - "dark" if the document body has the "dark" class,
 * - "light" otherwise.
 */
export function getCurrentThemeMode(): ThemeMode {
  if (currentMediaQuery) {
    return "auto";
  }
  return document.body.classList.contains("dark") ? "dark" : "light";
}

// -- React Context & Provider --

interface ThemeModeContextValue {
  mode: ThemeMode;
  switchToDarkMode: () => void;
  switchToLightMode: () => void;
  switchToAutoMode: () => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
    if (saved === "light") {
      document.body.classList.remove("dark");
      return "light";
    }
    if (saved === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.body.classList.toggle("dark", prefersDark);
      return "auto";
    }
    document.body.classList.add("dark");
    return "dark";
  });

  useEffect(() => {
    if (mode === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      mediaQuery.onchange = (e: MediaQueryListEvent) => updateTheme(e.matches);
      currentMediaQuery = mediaQuery;
    }
    // Subscribe to changes triggered by standalone functions
    const unsubscribe = subscribeToThemeChange((newMode) => {
      setMode(newMode);
    });
    return () => {
      unsubscribe();
      if (currentMediaQuery) {
        currentMediaQuery.onchange = null;
      }
    };
  }, [mode]);

  const value = useMemo(
    () => ({
      mode,
      switchToDarkMode,
      switchToLightMode,
      switchToAutoMode,
    }),
    [mode],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const context = useContext(ThemeModeContext);
  if (!context) {
    throw new Error("useThemeMode must be used within a ThemeModeProvider");
  }
  return context;
}
