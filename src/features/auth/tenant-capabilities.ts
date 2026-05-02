import { StoredAuthUser } from "./auth.types";

type TenantMembershipRole = "owner" | "admin" | "operario" | "staff";

type TenantCapability =
  | "distribuidora.admin.read"
  | "distribuidora.shell.read";

const ROLE_CAPABILITIES: Record<TenantMembershipRole, TenantCapability[]> = {
  owner: ["distribuidora.admin.read", "distribuidora.shell.read"],
  admin: ["distribuidora.admin.read", "distribuidora.shell.read"],
  staff: ["distribuidora.shell.read"],
  operario: ["distribuidora.shell.read"]
};

function isTenantMembershipRole(value: string): value is TenantMembershipRole {
  return value === "owner" || value === "admin" || value === "operario" || value === "staff";
}

export function userHasCapability(user: StoredAuthUser | null, capability: TenantCapability) {
  const membershipRole = user?.tenantContext?.membership.role;

  if (!membershipRole || !isTenantMembershipRole(membershipRole)) {
    return false;
  }

  return ROLE_CAPABILITIES[membershipRole].includes(capability);
}
