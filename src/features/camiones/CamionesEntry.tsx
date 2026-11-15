import { getStoredUser } from "../auth/auth.client";
import { CamionesDriverPage } from "./CamionesDriverPage";
import { CamionesHomePage } from "./CamionesHomePage";

// Entrada de /camiones: los camioneros ven su pantalla simple (solo cargar
// viajes); el administrador (La Milagrosa) ve la app completa.
export function CamionesEntry() {
  const role = getStoredUser()?.tenantContext?.membership.role;
  return role === "camionero" ? <CamionesDriverPage /> : <CamionesHomePage />;
}
