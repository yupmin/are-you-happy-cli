// CUSTOMIZE: which settings are secret, and how they are shown.
export function maskSetting(key: string, value: string): string {
  return /SECRET|TOKEN/i.test(key) ? maskValue(value) : value;
}

export const maskValue = (value: string): string => `${value.slice(0, 4)}****`;
