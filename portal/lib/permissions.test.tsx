import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";
import { describe, expect, it } from "vitest";
import { Can, can, usePermission } from "@/lib/permissions";
import { makeStore } from "@/store";
import { sessionLoaded } from "@/store/auth-slice";
import type { Me } from "@/lib/api/types";

const user: Me["user"] = {
  id: 1,
  name: "Test User",
  username: "test",
  email: null,
  phone: null,
  avatar_url: null,
  is_active: true,
  must_change_password: false,
  last_login_at: null,
  created_at: null,
  updated_at: null,
};

function storeWith(permissions: string[], role: string | null = "employee") {
  const store = makeStore();
  store.dispatch(sessionLoaded({ user, role, permissions, menu: [] }));
  return store;
}

function wrap(store: ReturnType<typeof makeStore>) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <Provider store={store}>{children}</Provider>;
  };
}

describe("can()", () => {
  const granted = ["users.view", "users.create", "pos.sell"];

  it("is true when the single permission is held", () => {
    expect(can(granted, "users.view")).toBe(true);
  });

  it("is false when the permission is missing", () => {
    expect(can(granted, "users.delete")).toBe(false);
  });

  it("requires every listed permission by default", () => {
    expect(can(granted, ["users.view", "users.create"])).toBe(true);
    expect(can(granted, ["users.view", "users.delete"])).toBe(false);
  });

  it("accepts any one of the listed permissions in 'any' mode", () => {
    expect(can(granted, ["users.delete", "pos.sell"], "any")).toBe(true);
    expect(can(granted, ["users.delete", "roles.view"], "any")).toBe(false);
  });

  it("treats an empty requirement as satisfied", () => {
    expect(can(granted, [])).toBe(true);
    expect(can([], [], "any")).toBe(true);
  });

  it("works with a Set", () => {
    expect(can(new Set(granted), "pos.sell")).toBe(true);
    expect(can(new Set(granted), "pos.void")).toBe(false);
  });

  it("is case-sensitive and never matches by prefix", () => {
    expect(can(granted, "users")).toBe(false);
    expect(can(granted, "Users.view")).toBe(false);
  });

  it("grants nothing to an empty permission list", () => {
    expect(can([], "users.view")).toBe(false);
  });
});

describe("usePermission()", () => {
  function Probe({ permission }: { permission: string }) {
    const { can: allowed, ready, role } = usePermission();
    return (
      <p>
        {String(ready)}|{role}|{String(allowed(permission))}
      </p>
    );
  }

  it("reads the signed-in user's permissions from the store", () => {
    render(<Probe permission="pos.sell" />, { wrapper: wrap(storeWith(["pos.sell"])) });
    expect(screen.getByText("true|employee|true")).toBeInTheDocument();
  });

  it("denies permissions the user does not hold", () => {
    render(<Probe permission="users.delete" />, { wrapper: wrap(storeWith(["pos.sell"])) });
    expect(screen.getByText("true|employee|false")).toBeInTheDocument();
  });

  it("is not ready before the session is loaded", () => {
    render(<Probe permission="pos.sell" />, { wrapper: wrap(makeStore()) });
    expect(screen.getByText("false||false")).toBeInTheDocument();
  });
});

describe("<Can>", () => {
  it("renders children when permitted", () => {
    render(
      <Can permission="users.view">
        <span>visible</span>
      </Can>,
      { wrapper: wrap(storeWith(["users.view"])) },
    );
    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("renders the fallback when not permitted", () => {
    render(
      <Can permission="users.delete" fallback={<span>nope</span>}>
        <span>visible</span>
      </Can>,
      { wrapper: wrap(storeWith(["users.view"])) },
    );
    expect(screen.queryByText("visible")).not.toBeInTheDocument();
    expect(screen.getByText("nope")).toBeInTheDocument();
  });

  it("supports any-of with the `any` prop", () => {
    render(
      <Can permission={["users.delete", "users.view"]} any>
        <span>visible</span>
      </Can>,
      { wrapper: wrap(storeWith(["users.view"])) },
    );
    expect(screen.getByText("visible")).toBeInTheDocument();
  });

  it("hides everything from a signed-out user", () => {
    render(
      <Can permission="dashboard.view">
        <span>visible</span>
      </Can>,
      { wrapper: wrap(makeStore()) },
    );
    expect(screen.queryByText("visible")).not.toBeInTheDocument();
  });
});
