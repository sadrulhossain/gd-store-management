import { SIDEBAR_COOKIE, THEME_COOKIE } from "@/lib/auth/cookie-names";

export type ThemePreference = "light" | "dark" | "system";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark" || value === "system";
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveTheme(preference: ThemePreference): "light" | "dark" {
  return preference === "system" ? (systemPrefersDark() ? "dark" : "light") : preference;
}

/** Toggle the `dark` class on <html> (the Tailwind dark variant is class based). */
export function applyTheme(preference: ThemePreference): void {
  document.documentElement.classList.toggle("dark", resolveTheme(preference) === "dark");
}

/** Preferences are plain cookies (not httpOnly): the server reads them to render the right theme first paint. */
export function writePreferenceCookie(name: string, value: string): void {
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; SameSite=Lax`;
}

export function persistTheme(preference: ThemePreference): void {
  writePreferenceCookie(THEME_COOKIE, preference);
}

export function persistSidebar(collapsed: boolean): void {
  writePreferenceCookie(SIDEBAR_COOKIE, collapsed ? "1" : "0");
}

/**
 * Runs before first paint (inlined in <head>) when the preference is "system" or unset,
 * so the page never flashes the wrong theme.
 */
export const THEME_BOOTSTRAP_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);var t=m?decodeURIComponent(m[1]):"system";if(t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;
