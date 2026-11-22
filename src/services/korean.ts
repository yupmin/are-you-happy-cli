// SAMPLE: Korean topic particle for the Mood message.
const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;

/** 은/는 by whether the last Hangul syllable has a final consonant (받침); 은(는) otherwise. */
export function topicParticle(word: string): "은" | "는" | "은(는)" {
  const code = word.trim().codePointAt(word.trim().length - 1);
  if (code === undefined || code < HANGUL_START || code > HANGUL_END) return "은(는)";
  return (code - HANGUL_START) % 28 === 0 ? "는" : "은";
}
