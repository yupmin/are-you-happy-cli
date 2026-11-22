import { describe, expect, it } from "vitest";
import { formatIsoInTimeZone } from "../src/time";

describe("formatIsoInTimeZone", () => {
  it.each([
    ["2026-11-22T14:10:00Z", "Asia/Seoul", "2026-11-22T23:10:00+09:00"],
    ["2026-11-22T14:10:00Z", "UTC", "2026-11-22T14:10:00+00:00"],
    ["2026-07-01T03:04:05Z", "America/New_York", "2026-06-30T23:04:05-04:00"],
    ["2026-11-22T14:10:00Z", "Asia/Kolkata", "2026-11-22T19:40:00+05:30"],
  ])("%s in %s → %s", (iso, tz, expected) => {
    expect(formatIsoInTimeZone(new Date(iso), tz)).toBe(expected);
  });
});
