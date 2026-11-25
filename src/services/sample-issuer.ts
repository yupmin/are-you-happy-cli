import {
  ApiError,
  type ClientCredentials,
  type TokenIssuer,
  type TokenResponse,
} from "./token-issuer";

// CUSTOMIZE: the sample Client Credentials the issuer accepts.
export const SAMPLE_CLIENT_ID = "happy-client";
export const SAMPLE_CLIENT_SECRET = "happy-secret";
// CUSTOMIZE: the token values and lifetime the issuer hands out.
export const ACCESS_TOKEN = "it.me.and.you";
export const REFRESH_TOKEN = "it.me.and.you.again";
export const TOKEN_TTL_SECONDS = 3600;

const grant = (): TokenResponse => ({
  accessToken: ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  expiresIn: TOKEN_TTL_SECONDS,
});

/** In-process TokenIssuer. No HTTP. */
export const sampleIssuer: TokenIssuer = {
  async issueToken(creds: ClientCredentials): Promise<TokenResponse> {
    if (creds.clientId !== SAMPLE_CLIENT_ID || creds.clientSecret !== SAMPLE_CLIENT_SECRET) {
      throw new ApiError(401);
    }
    return grant();
  },
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    if (refreshToken !== REFRESH_TOKEN) throw new ApiError(401);
    return grant();
  },
};
