import { StoredAuthUser } from "./auth.types";

export function userCanAccessSaasAdmin(user: StoredAuthUser | null) {
  const globalRole = user?.role;
  return globalRole === "admin" || globalRole === "owner";
}
