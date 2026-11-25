/** Client Credentials presented to a TokenIssuer. */
export interface ClientCredentials {
  clientId: string;
  clientSecret: string;
}

/** What issue and refresh return. `expiresIn` is seconds from now. */
export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * The auth adapter. Throws ApiError (status is the HTTP-style code).
 * Sample Action endpoints are not part of this interface.
 */
export interface TokenIssuer {
  issueToken(creds: ClientCredentials): Promise<TokenResponse>;
  refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
}

/** Raised by a TokenIssuer. Anything else is an unexpected failure. */
export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API responded ${status}`);
    this.name = "ApiError";
  }
}
