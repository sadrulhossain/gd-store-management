import { describe, expect, it } from "vitest";
import { requiredPermissionFor, safeNextPath } from "@/lib/routes";

describe("requiredPermissionFor()", () => {
  it.each([
    ["/dashboard", "dashboard.view"],
    ["/users", "users.view"],
    ["/users/12", "users.view"],
    ["/users/new", "users.create"],
    ["/users/12/edit", "users.update"],
    ["/roles", "roles.view"],
    ["/roles/new", "roles.create"],
    ["/roles/3", "roles.view"],
    ["/permissions", "permissions.view"],
    ["/menus", "menus.view"],
  ])("%s needs %s", (path, permission) => {
    expect(requiredPermissionFor(path)).toBe(permission);
  });

  it("needs nothing for pages open to every signed-in user", () => {
    expect(requiredPermissionFor("/profile")).toBeNull();
    expect(requiredPermissionFor("/403")).toBeNull();
  });

  it("does not match a longer segment that merely starts with a prefix", () => {
    expect(requiredPermissionFor("/usersettings")).toBeNull();
  });
});

describe("safeNextPath()", () => {
  it("keeps same-site relative paths", () => {
    expect(safeNextPath("/users?page=2")).toBe("/users?page=2");
  });

  it.each([
    "https://evil.example/phish",
    "//evil.example",
    "/\\evil.example",
    "javascript:alert(1)",
    "users",
    "",
  ])("rejects %j", (value) => {
    expect(safeNextPath(value)).toBe("/dashboard");
  });

  it("rejects loops back to the login page and internal routes", () => {
    expect(safeNextPath("/login")).toBe("/dashboard");
    expect(safeNextPath("/bff/auth/me")).toBe("/dashboard");
  });

  it("falls back for missing values", () => {
    expect(safeNextPath(null)).toBe("/dashboard");
    expect(safeNextPath(undefined, "/profile")).toBe("/profile");
  });
});
