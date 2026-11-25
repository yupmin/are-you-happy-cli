import { z } from "zod";
import {
  ApiError,
  type ClientCredentials,
  type TokenIssuer,
  type TokenResponse,
} from "./token-issuer";

// CUSTOMIZE: path under ARE_YOU_HAPPY_CLI_API_URL, and how long one token POST may take.
export const TOKEN_PATH = "oauth/token";
export const HTTP_TIMEOUT_MS = 10_000;

const accessToken = z.string().min(1);
const refreshToken = z.string().min(1);
const expiresIn = z.number().int().positive();

// CUSTOMIZE: the JSON the token endpoint must return. Unknown fields are ignored.
const issuedGrant = z.object({
  access_token: accessToken,
  refresh_token: refreshToken,
  expires_in: expiresIn,
});

const refreshedGrant = issuedGrant.extend({
  refresh_token: refreshToken.optional(),
});

export interface HttpTokenIssuerOptions {
  /** Absolute http(s) URL with no username or password. */
  baseUrl: string;
  timeoutMs?: number;
  /**
   * Sent on the refresh_token grant when both are set. `issueToken` uses the
   * credentials passed to that call. The port does not pass them to refresh.
   */
  clientId?: string;
  clientSecret?: string;
  fetch?: typeof fetch;
}

/** Absolute http(s) URL with no userinfo, or null. The value is never echoed by callers. */
export function parseHttpBaseUrl(value: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username !== "" || url.password !== "") return null;
  return url;
}

/** `{base}/{TOKEN_PATH}` with any query or hash removed. */
export function tokenEndpoint(base: URL): string {
  const url = new URL(base.href);
  const path = url.pathname.replace(/\/+$/, "");
  url.pathname = `${path}/${TOKEN_PATH}`;
  url.search = "";
  url.hash = "";
  return url.href;
}

/**
 * OAuth2 token endpoint. `issueToken` is `client_credentials`. `refreshAccessToken`
 * is `refresh_token` (reuses the sent refresh token when the body omits one).
 * Failures are ApiError only: the HTTP status, 504 on timeout, 503 on network
 * failure, 502 when a 2xx body is not the grant schema. Redirects are not followed
 * (`307` would resend the body). The message is the status. Request and response
 * bodies, and the Location header, are not attached to the error.
 */
export function createHttpTokenIssuer(options: HttpTokenIssuerOptions): TokenIssuer {
  const base = parseHttpBaseUrl(options.baseUrl);
  if (!base) throw new ApiError(400);
  const endpoint = tokenEndpoint(base);
  const timeoutMs = options.timeoutMs ?? HTTP_TIMEOUT_MS;
  const fetchImpl = options.fetch ?? fetch;

  async function post(
    fields: Record<string, string>,
    schema: typeof issuedGrant | typeof refreshedGrant,
    fallbackRefresh?: string,
  ): Promise<TokenResponse> {
    const signal = AbortSignal.timeout(timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams(fields),
        redirect: "manual",
        signal,
      });
    } catch {
      throw new ApiError(signal.aborted ? 504 : 503);
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined);
      throw new ApiError(response.status);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      throw new ApiError(502);
    }
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ApiError(502);
    const refresh = parsed.data.refresh_token ?? fallbackRefresh;
    if (!refresh) throw new ApiError(502);
    return {
      accessToken: parsed.data.access_token,
      refreshToken: refresh,
      expiresIn: parsed.data.expires_in,
    };
  }

  return {
    issueToken(creds: ClientCredentials) {
      return post(
        {
          grant_type: "client_credentials",
          client_id: creds.clientId,
          client_secret: creds.clientSecret,
        },
        issuedGrant,
      );
    },
    refreshAccessToken(refreshTokenValue: string) {
      const fields: Record<string, string> = {
        grant_type: "refresh_token",
        refresh_token: refreshTokenValue,
      };
      if (options.clientId && options.clientSecret) {
        fields.client_id = options.clientId;
        fields.client_secret = options.clientSecret;
      }
      return post(fields, refreshedGrant, refreshTokenValue);
    },
  };
}
