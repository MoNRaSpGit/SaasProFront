export type AuthUser = {
  id: number;
  email: string;
  fullName: string | null;
  role: string;
};

export type TenantContext = {
  tenant: {
    id: number;
    name: string;
    slug: string;
    status: string;
  };
  membership: {
    role: string;
    status: string;
    isDefault: boolean;
  };
  billing: {
    status: "active" | "grace_period" | "pending_manual_block" | "blocked";
    paidUntil: string | null;
    graceUntil: string | null;
    blockedReason: string | null;
  };
  modules: string[];
  products?: Array<{
    key: string;
    label: string;
    frontend: string;
  }>;
  preferredFrontend?: string | null;
};

export type StoredAuthUser = AuthUser & {
  tenantContext: TenantContext | null;
  isDemoSession?: boolean;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  accessTtl: string;
  refreshTtl: string;
};

export type AuthSession = {
  user: AuthUser;
  tenantContext: TenantContext | null;
  tokens: AuthTokens;
  isDemoSession?: boolean;
};
