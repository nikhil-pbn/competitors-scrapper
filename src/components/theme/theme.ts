/**
 * Shared theme constants — deliberately free of "use client" and JSX so a
 * single source of truth can be imported by both server modules (ThemeScript)
 * and client modules (ThemeProvider) without directive friction.
 */

export type Theme = "light" | "dark";

/** localStorage key holding the user's explicit choice. */
export const THEME_STORAGE_KEY = "theme";

/** Class toggled on <html>; must match the `@custom-variant dark` in globals.css. */
export const DARK_CLASS = "dark";

/**
 * Render-blocking bootstrap that applies the persisted (or system) theme to
 * <html> before first paint, so there is no light/dark flash on load. It runs
 * before any JS bundle is parsed, so it is kept tiny, dependency-free, and
 * self-contained. Built from the constants above (via JSON.stringify for safe
 * escaping) so the key and class can never drift from the app code.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  THEME_STORAGE_KEY,
)});if(t!=="light"&&t!=="dark")t=window.matchMedia("(prefers-color-scheme:dark)").matches?"dark":"light";var e=document.documentElement;e.classList.toggle(${JSON.stringify(
  DARK_CLASS,
)},t==="dark");e.style.colorScheme=t;}catch(e){}})();`;
