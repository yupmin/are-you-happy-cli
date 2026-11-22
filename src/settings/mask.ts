// CUSTOMIZE: which settings are secret, and how they are shown.
export function maskSetting(key: string, value: string): string {
  return /SECRET|TOKEN/i.test(key) ? maskValue(value) : value;
}

/** First 4 chars + `****`; values of 4 chars or fewer are fully hidden. */
export const maskValue = (value: string): string =>
  value.length <= 4 ? "****" : `${value.slice(0, 4)}****`;
