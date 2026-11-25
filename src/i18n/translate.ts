import { TELUGU } from './te';
import { CAPITAL_WORDS, WORDS } from './te-words';

const WORD = /[A-Za-z][A-Za-z']*/g;

function translateWord(word: string): string {
  // ALL CAPITALS are marks (OK, AB) or names, so they stay as typed, except a few known short words (KG, UPI).
  if (word.length > 1 && word === word.toUpperCase() && !CAPITAL_WORDS.has(word)) return word;
  if (word.length === 1) return word;
  const lower = word.toLowerCase();
  const direct = WORDS[lower];
  if (direct) return direct;
  // A plural of a known word (bag → bags) reads as the word and a Telugu "s".
  if (lower.endsWith('s') && lower.length > 3) {
    const base = WORDS[lower.slice(0, -1)];
    if (base) return `${base}స్`;
  }
  return word;
}

/** English text with its words in Telugu letters. A full sentence listed in te.ts wins; anything else goes word by word. */
export function toTelugu(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;
  const whole = TELUGU[trimmed];
  if (whole) return text.replace(trimmed, whole);
  return text.replace(WORD, translateWord);
}
