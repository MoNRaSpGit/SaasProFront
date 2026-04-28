import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAccessToken } from "./auth.client";

type Props = {
  children: ReactNode;
};

export function ProtectedRoute({ children }: Props) {
  const token = getAccessToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
