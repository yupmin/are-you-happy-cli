import { ACCESS_TOKEN } from "./sample-issuer";
import { ApiError } from "./token-issuer";

// SAMPLE: the Mood endpoint. Delete with action are-you.
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
