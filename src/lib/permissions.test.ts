import { describe, expect, it } from "vitest";
import {
  BUSINESS_CONFIG_PERMISSIONS,
  ALL_PERMISSION_KEYS,
  canAccess,
  defaultPermissionsForRole,
  isUnrestrictedRole,
  normalizePermissions,
  summarizePermissions,
} from "./permissions";

describe("defaultPermissionsForRole", () => {
  it("grants agents operational modules but not business configuration", () => {
    const perms = defaultPermissionsForRole("agent");
    expect(perms.automations).toBe(false);
    expect(perms.ai).toBe(false);
    expect(perms.settings).toBe(false);
    for (const key of ["dashboard", "inbox", "contacts", "pipelines", "broadcasts"]) {
      expect(perms[key as keyof typeof perms]).toBe(true);
    }
  });

  it("grants admins full access", () => {
    const perms = defaultPermissionsForRole("admin");
    for (const key of ALL_PERMISSION_KEYS) {
      expect(perms[key]).toBe(true);
    }
  });

  it("grants unknown/null roles the agent (least-privilege) default", () => {
    for (const role of [null, undefined, "user", ""]) {
      const perms = defaultPermissionsForRole(role);
      expect(perms.ai).toBe(false);
      expect(perms.settings).toBe(false);
      expect(perms.inbox).toBe(true);
    }
  });
});

describe("normalizePermissions", () => {
  it("drops unknown keys and fills missing ones with role defaults", () => {
    const out = normalizePermissions({ ai: true, madeUp: true }, "agent");
    expect(out.ai).toBe(true);
    expect(out.settings).toBe(false);
    expect("madeUp" in out).toBe(false);
  });

  it("returns role defaults for null/undefined/invalid input", () => {
    expect(normalizePermissions(null, "agent")).toEqual(
      defaultPermissionsForRole("agent"),
    );
    expect(normalizePermissions("nope", "admin")).toEqual(
      defaultPermissionsForRole("admin"),
    );
    expect(normalizePermissions([], "agent")).toEqual(
      defaultPermissionsForRole("agent"),
    );
  });
});

describe("canAccess", () => {
  it("always grants owners and superadmins full access", () => {
    expect(canAccess({ ...defaultPermissionsForRole("agent"), ai: false }, "ai", "owner")).toBe(true);
    expect(canAccess(null, "settings", "superadmin")).toBe(true);
  });

  it("honours stored permissions for agents", () => {
    const perms = { ...defaultPermissionsForRole("agent"), ai: true };
    expect(canAccess(perms, "ai", "agent")).toBe(true);
    expect(canAccess(perms, "automations", "agent")).toBe(false);
  });

  it("falls back to role defaults when permissions are missing", () => {
    expect(canAccess(null, "ai", "agent")).toBe(false);
    expect(canAccess(null, "ai", "admin")).toBe(true);
    expect(canAccess(null, "inbox", "agent")).toBe(true);
  });
});

describe("summarizePermissions", () => {
  it("reports full access for owners", () => {
    expect(summarizePermissions(null, "owner")).toBe("Full access");
  });

  it("lists disabled business configuration for restricted agents", () => {
    const summary = summarizePermissions(null, "agent");
    expect(summary).toContain("no AI Hub, Automations, Settings");
  });
});

describe("BUSINESS_CONFIG_PERMISSIONS", () => {
  it("covers the business configuration modules agents should not get by default", () => {
    expect(BUSINESS_CONFIG_PERMISSIONS.sort()).toEqual(["ai", "automations", "settings"]);
    expect(isUnrestrictedRole("owner")).toBe(true);
    expect(isUnrestrictedRole("agent")).toBe(false);
  });
});
