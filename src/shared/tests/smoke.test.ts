import { describe, expect, it } from "vitest";
import { getDefaultAuthenticatedRoute, getFirstAccessibleModuleRoute, hasModuleAccess } from "../../features/auth/module-routing";
import { userHasCapability } from "../../features/auth/tenant-capabilities";
import { StoredAuthUser } from "../../features/auth/auth.types";

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
      modules
    }
  };
}

describe("frontend smoke", () => {
  it("routes single-module users directly to that module", () => {
    expect(getDefaultAuthenticatedRoute(buildUser(["camiones"]))).toBe("/camiones");
    expect(getDefaultAuthenticatedRoute(buildUser(["pos"]))).toBe("/pos");
  });

  it("keeps dashboard as fallback for mixed or unknown contexts", () => {
    expect(getDefaultAuthenticatedRoute(buildUser(["camiones", "pos"]))).toBe("/dashboard");
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
  });
});
