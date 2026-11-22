import { describe, expect, it } from "vitest";
import { topicParticle } from "../src/services/korean";

describe("topicParticle", () => {
  it.each([
    ["민수", "는"],
    ["영진", "은"],
    ["철수", "는"],
    ["하늘", "은"],
    ["Minsu", "은(는)"],
    ["", "은(는)"],
  ])("%s → %s", (name, particle) => {
    expect(topicParticle(name)).toBe(particle);
  });
});
