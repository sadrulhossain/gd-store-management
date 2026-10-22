import { describe, expect, it } from "vitest";
import type { Me } from "@/lib/api/types";
import { makeStore } from "@/store";
import { sessionCleared, sessionLoaded } from "@/store/auth-slice";
import { setSidebarCollapsed, setTheme, toggleSidebar } from "@/store/ui-slice";

const me: Me = {
  user: {
    id: 7,
    name: "Rina",
    username: "rina",
    email: null,
    phone: null,
    avatar_url: null,
    is_active: true,
    must_change_password: false,
    last_login_at: null,
    created_at: null,
    updated_at: null,
  },
  role: "manager",
  permissions: ["dashboard.view", "users.view"],
  menu: [],
};

describe("auth slice", () => {
  it("starts idle with no permissions", () => {
    const state = makeStore().getState().auth;
    expect(state).toMatchObject({ status: "idle", user: null, permissions: [] });
  });

  it("stores the user, role and permissions when the session loads", () => {
    const store = makeStore();
    store.dispatch(sessionLoaded(me));

    expect(store.getState().auth).toMatchObject({
      status: "authenticated",
      role: "manager",
      permissions: me.permissions,
    });
    expect(store.getState().auth.user?.username).toBe("rina");
  });

  it("never holds tokens", () => {
    const store = makeStore();
    store.dispatch(sessionLoaded(me));

    expect(JSON.stringify(store.getState())).not.toMatch(/token/i);
  });

  it("clears everything on sign-out", () => {
    const store = makeStore();
    store.dispatch(sessionLoaded(me));
    store.dispatch(sessionCleared());

    expect(store.getState().auth).toEqual({
      status: "unauthenticated",
      user: null,
      role: null,
      permissions: [],
    });
  });
});

describe("ui slice", () => {
  it("is seeded from server-read cookie preferences", () => {
    const store = makeStore({ theme: "dark", sidebarCollapsed: true });
    expect(store.getState().ui).toMatchObject({
      theme: "dark",
      sidebarCollapsed: true,
      mobileNavOpen: false,
    });
  });

  it("toggles and sets the sidebar", () => {
    const store = makeStore();
    store.dispatch(toggleSidebar());
    expect(store.getState().ui.sidebarCollapsed).toBe(true);
    store.dispatch(setSidebarCollapsed(false));
    expect(store.getState().ui.sidebarCollapsed).toBe(false);
  });

  it("persists theme and sidebar preferences to cookies and applies the theme class", () => {
    const store = makeStore();

    store.dispatch(setTheme("dark"));
    expect(document.cookie).toContain("sm_theme=dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);

    store.dispatch(setTheme("light"));
    expect(document.cookie).toContain("sm_theme=light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);

    store.dispatch(toggleSidebar());
    expect(document.cookie).toContain("sm_sidebar=1");
  });
});
