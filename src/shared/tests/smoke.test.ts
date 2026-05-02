import { describe, expect, it } from "vitest";
import { getDefaultAuthenticatedRoute, getFirstAccessibleModuleRoute, hasModuleAccess } from "../../features/auth/module-routing";
import { userCanAccessSaasAdmin, userHasCapability } from "../../features/auth/tenant-capabilities";
import { StoredAuthUser } from "../../features/auth/auth.types";
import { FRONTEND_BUILD_INFO } from "../config/build";

function buildUser(modules: string[]): StoredAuthUser {
  return {
    id: 1,
    email: "demo@saaspro.com",
    fullName: "Demo User",
    role: "admin",
    tenantContext: {
      tenant: {
        id: 10,
        name: "Demo Tenant",
        slug: "demo-tenant",
        status: "active"
      },
      membership: {
        role: "admin",
        status: "active",
        isDefault: true
      },
      billing: {
        status: "active",
        paidUntil: null,
        graceUntil: null,
        blockedReason: null
      },
      modules
    }
  };
}

describe("frontend smoke", () => {
  it("routes single-module users directly into their module", () => {
    expect(getDefaultAuthenticatedRoute(buildUser(["camiones"]))).toBe("/camiones");
    expect(getDefaultAuthenticatedRoute(buildUser(["pos"]))).toBe("/pos");
  });

  it("keeps dashboard for multi-module tenants", () => {
    expect(getDefaultAuthenticatedRoute(buildUser(["camiones", "pos"]))).toBe("/dashboard");
  });

  it("keeps dashboard as fallback for unknown contexts", () => {
    expect(getFirstAccessibleModuleRoute(buildUser(["unknown-module"]))).toBe("/dashboard");
  });

  it("checks module access against tenant context", () => {
    const user = buildUser(["distribuidora", "camiones"]);
    expect(hasModuleAccess(user, "camiones")).toBe(true);
    expect(hasModuleAccess(user, "pos")).toBe(false);
  });

  it("derives frontend capabilities from membership role", () => {
    const adminUser = buildUser(["distribuidora"]);
    const operarioUser = {
      ...buildUser(["distribuidora"]),
      tenantContext: {
        ...buildUser(["distribuidora"]).tenantContext!,
        membership: {
          role: "operario",
          status: "active",
          isDefault: true
        }
      }
    };

    expect(userHasCapability(adminUser, "distribuidora.admin.read")).toBe(true);
    expect(userHasCapability(operarioUser, "distribuidora.admin.read")).toBe(false);
    expect(userHasCapability(operarioUser, "distribuidora.shell.read")).toBe(true);
    expect(userCanAccessSaasAdmin(adminUser)).toBe(true);
    expect(userCanAccessSaasAdmin({ ...adminUser, role: "member" })).toBe(false);
  });

  it("exposes frontend build information", () => {
    expect(typeof FRONTEND_BUILD_INFO.version).toBe("string");
    expect(FRONTEND_BUILD_INFO.version.length).toBeGreaterThan(0);
    expect(typeof FRONTEND_BUILD_INFO.releaseSha).toBe("string");
    expect(FRONTEND_BUILD_INFO.environment.length).toBeGreaterThan(0);
  });
});
