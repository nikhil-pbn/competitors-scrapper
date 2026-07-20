"use client";

import { useCallback, useSyncExternalStore, type ReactNode } from "react";

import { DARK_CLASS, THEME_STORAGE_KEY, type Theme } from "./theme";

export type { Theme };

/*
 * The source of truth for the theme is the DOM itself (`.dark` on <html>) plus
 * localStorage, both set before hydration by ThemeScript. We read that through
 * useSyncExternalStore so the value is correct on the client without a
 * hydration mismatch — and without calling setState inside an effect.
 */

const listeners = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains(DARK_CLASS)
    ? "dark"
    : "light";
}

/** Server render (and initial hydration) has no DOM theme — default to light. */
function getServerSnapshot(): Theme {
  return "light";
}

function setTheme(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle(DARK_CLASS, theme === "dark");
  root.style.colorScheme = theme;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode) — theme still applies for this session.
  }
  for (const listener of listeners) listener();
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggleTheme = useCallback(() => {
    setTheme(getSnapshot() === "dark" ? "light" : "dark");
  }, []);

  return { theme, toggleTheme, setTheme };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
