import { StoredAuthUser } from "./auth.types";

const KNOWN_MODULE_ROUTES: Record<string, string> = {
  pos: "/pos",
  camiones: "/camiones",
  distribuidora: "/distribuidora"
};

export function getEnabledModules(user: StoredAuthUser | null) {
  return user?.tenantContext?.modules || [];
}

export function getDefaultAuthenticatedRoute(user: StoredAuthUser | null) {
  const modules = getEnabledModules(user);

  if (modules.length === 1) {
    return KNOWN_MODULE_ROUTES[modules[0]] || "/dashboard";
  }

  return "/dashboard";
}

export function hasModuleAccess(user: StoredAuthUser | null, moduleKey: string) {
  const modules = getEnabledModules(user);
  return modules.includes(moduleKey);
}

export function getFirstAccessibleModuleRoute(user: StoredAuthUser | null) {
  const modules = getEnabledModules(user);

  for (const moduleKey of modules) {
    const route = KNOWN_MODULE_ROUTES[moduleKey];
    if (route) {
      return route;
    }
  }

  return "/dashboard";
}
