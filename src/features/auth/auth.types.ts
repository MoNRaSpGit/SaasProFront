export type AuthUser = {
  id: number;
  email: string;
  fullName: string | null;
  role: string;
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
  tokens: AuthTokens;
};
