import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies } from "next/headers";
import { Providers } from "@/components/providers";
import { SIDEBAR_COOKIE, THEME_COOKIE } from "@/lib/auth/cookie-names";
import { THEME_BOOTSTRAP_SCRIPT, isThemePreference } from "@/lib/theme/apply";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  fallback: ["ui-sans-serif", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
});

export const metadata: Metadata = {
  title: { default: "Store Management", template: "%s · Store Management" },
  description: "Store Management System",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7faf9" },
    { media: "(prefers-color-scheme: dark)", color: "#0a1514" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const store = await cookies();
  const themeCookie = store.get(THEME_COOKIE)?.value;
  const theme = isThemePreference(themeCookie) ? themeCookie : "system";
  const sidebarCollapsed = store.get(SIDEBAR_COOKIE)?.value === "1";

  return (
    <html
      lang="en"
      // An explicit preference is rendered on the server; "system" is resolved by the inline script below.
      className={`${inter.variable} ${theme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <head>
        {theme === "system" && (
          <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP_SCRIPT }} />
        )}
      </head>
      <body className="min-h-dvh">
        <Providers initialUi={{ theme, sidebarCollapsed }}>{children}</Providers>
      </body>
    </html>
  );
}
