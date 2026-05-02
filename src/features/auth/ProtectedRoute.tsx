import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { clearSession, getAccessToken, getStoredUser, isDemoAuthEnabled, isDemoToken } from "./auth.client";
import { getFirstAccessibleModuleRoute, hasModuleAccess } from "./module-routing";

type Props = {
  children: ReactNode;
  requiredModule?: string;
};

export function ProtectedRoute({ children, requiredModule }: Props) {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  if (isDemoToken(token) && !isDemoAuthEnabled()) {
    clearSession();
    return <Navigate to="/login" replace />;
  }

  const user = getStoredUser();

  if (requiredModule && !hasModuleAccess(user, requiredModule)) {
    return <Navigate to={getFirstAccessibleModuleRoute(user)} replace />;
  }

  return children;
}
