export type SaasAdminTenantBilling = {
  status: "active" | "grace_period" | "pending_manual_block" | "blocked";
  paidUntil: string | null;
  graceUntil: string | null;
  blockedReason: string | null;
};

export type SaasAdminModuleKey = "camiones";

export type SaasAdminTenantItem = {
  id: number;
  name: string;
  slug: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  billing: SaasAdminTenantBilling;
  primaryUser: {
    email: string;
    fullName: string | null;
    membershipRole: string | null;
  } | null;
  modules: SaasAdminModuleKey[];
};

export type SaasAdminTenantListResponse = {
  availableModules: SaasAdminModuleKey[];
  items: SaasAdminTenantItem[];
  total: number;
};

export type UpdateTenantBillingPayload = {
  billingStatus: SaasAdminTenantBilling["status"];
  paidUntil?: string | null;
  graceUntil?: string | null;
  blockedReason?: string | null;
};

export type UpdateTenantModulesPayload = {
  enabledModules: SaasAdminModuleKey[];
};
