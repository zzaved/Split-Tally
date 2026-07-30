/**
 * Turning what someone said into a number.
 *
 * Recognisers are inconsistent about this: the same sentence comes back as
 * "20", "twenty" or "twenty euros" depending on the engine and on how fast it
 * was said. Reading only digits meant "twenty euros" scored as no answer at
 * all and the question was asked again, which is the single most irritating
 * thing a voice interface can do.
 */

const UNITS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
};

const TENS: Record<string, number> = {
  twenty: 20,
  thirty: 30,
  forty: 40,
  fifty: 50,
  sixty: 60,
  seventy: 70,
  eighty: 80,
  ninety: 90,
};

/**
 * The first number in a sentence, however it was written down.
 *
 * Digits win when present, because "£20.50" is unambiguous and spelling it out
 * word by word is not. Words are read left to right, so "twenty five" is 25
 * and "a hundred and twenty" is 120. Returns null when there is no number,
 * which is different from a number that happens to be zero.
 */
export function spokenNumber(text: string): number | null {
  const cleaned = text.toLowerCase().replace(/,/g, ".");

  const digits = cleaned.match(/\d+(?:\.\d{1,2})?/);
  if (digits) return Number(digits[0]);

  const words = cleaned.replace(/[^a-z\s-]/g, " ").split(/[\s-]+/);
  let total = 0;
  let group = 0;
  let seen = false;
  // A number is finished once it has both a tens and a units part. Without
  // this, "forty two fifty" adds all three and reads as ninety two.
  let hasTens = false;
  let hasUnit = false;

  for (const word of words) {
    if (word in UNITS) {
      if (hasUnit) break;
      group += UNITS[word];
      hasUnit = true;
      seen = true;
    } else if (word in TENS) {
      if (hasTens || hasUnit) break;
      group += TENS[word];
      hasTens = true;
      seen = true;
    } else if (word === "hundred") {
      group = Math.max(group, 1) * 100;
      hasTens = false;
      hasUnit = false;
      seen = true;
    } else if (word === "thousand") {
      total += Math.max(group, 1) * 1000;
      group = 0;
      hasTens = false;
      hasUnit = false;
      seen = true;
    } else if (word === "and" && seen) {
      // "a hundred and twenty" keeps counting; anything else ends the number.
      continue;
    } else if (seen) {
      break;
    }
  }

  return seen ? total + group : null;
}

/** Words that mean "leave it as it is" rather than naming a value. */
export function meansKeep(text: string): boolean {
  return /\b(keep|leave|stay|same|that'?s? fine|sounds? good|as suggested|no change|fine)\b/i.test(
    text,
  );
}

/**
 * A nudge rather than a value: "a bit more", "lower". Returns the direction,
 * or null when the sentence names no direction at all.
 */
export function nudge(text: string): 1 | -1 | null {
  if (/\b(more|higher|bigger|raise|increase|up)\b/i.test(text)) return 1;
  if (/\b(less|lower|smaller|reduce|decrease|down)\b/i.test(text)) return -1;
  return null;
}
