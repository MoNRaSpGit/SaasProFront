import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearSession, getAccessToken, getStoredUser, isDemoAuthEnabled, isDemoToken } from "./auth.client";
import { getFirstAccessibleModuleRoute, hasModuleAccess } from "./module-routing";
import { userCanAccessSaasAdmin, userHasCapability } from "./tenant-capabilities";

type Props = {
  children: ReactNode;
  requiredModule?: string;
  requiredCapability?: "distribuidora.admin.read" | "distribuidora.shell.read";
  requireSaasAdmin?: boolean;
};

export function ProtectedRoute({ children, requiredModule, requiredCapability, requireSaasAdmin }: Props) {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isDemoToken(token) && !isDemoAuthEnabled()) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  const user = getStoredUser();

  if (requireSaasAdmin && !userCanAccessSaasAdmin(user)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredModule && !hasModuleAccess(user, requiredModule)) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requiredCapability && !userHasCapability(user, requiredCapability)) {
    return <Navigate to={getFirstAccessibleModuleRoute(user)} replace />;
  }

  return children;
}
