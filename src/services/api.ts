/**
 * The virtual API (are.you.happy.cli). No HTTP: plain in-process functions that behave like
 * a remote API, including 401s.
 */

// CUSTOMIZE: the sample Client Credentials the API accepts.
export const SAMPLE_CLIENT_ID = "happy-client";
export const SAMPLE_CLIENT_SECRET = "happy-secret";
// CUSTOMIZE: the token values and lifetime the API hands out.
export const ACCESS_TOKEN = "it.me.and.you";
export const REFRESH_TOKEN = "it.me.and.you.again";
export const TOKEN_TTL_SECONDS = 3600;

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API responded ${status}`);
    this.name = "ApiError";
  }
}

export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const grant = (): TokenResponse => ({
  accessToken: ACCESS_TOKEN,
  refreshToken: REFRESH_TOKEN,
  expiresIn: TOKEN_TTL_SECONDS,
});

export async function issueToken(clientId: string, clientSecret: string): Promise<TokenResponse> {
  if (clientId !== SAMPLE_CLIENT_ID || clientSecret !== SAMPLE_CLIENT_SECRET)
    throw new ApiError(401);
  return grant();
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  if (refreshToken !== REFRESH_TOKEN) throw new ApiError(401);
  return grant();
}

// SAMPLE: the Mood endpoint.
export const MOODS = ["happy", "sad", "angry", "excited", "tired"] as const;
export type Mood = (typeof MOODS)[number];

// SAMPLE: `random` is injected so tests are deterministic.
export async function getMood(
  accessToken: string,
  name: string,
  random: () => number,
): Promise<{ name: string; mood: Mood }> {
  if (accessToken !== ACCESS_TOKEN) throw new ApiError(401);
  const mood = MOODS[Math.min(MOODS.length - 1, Math.floor(random() * MOODS.length))] as Mood;
  return { name, mood };
}
