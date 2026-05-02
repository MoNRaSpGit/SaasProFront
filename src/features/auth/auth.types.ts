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
  modules: string[];
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
