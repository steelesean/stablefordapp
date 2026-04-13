/**
 * Join code generation for competitions.
 *
 * Produces a 6-character uppercase alphanumeric code (e.g. "ABC123").
 * Avoids ambiguous characters: 0/O, 1/I/L to prevent transcription errors
 * when players type the code on their phone.
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 30 chars, no 0/O/1/I/L

export const JOIN_CODE_LENGTH = 6;

/**
 * Generate a random join code. Not guaranteed unique — caller must
 * retry on collision (extremely unlikely with 30^6 ≈ 729M possibilities).
 */
export function generateJoinCode(): string {
  const chars: string[] = [];
  const bytes = crypto.getRandomValues(new Uint8Array(JOIN_CODE_LENGTH));
  for (let i = 0; i < JOIN_CODE_LENGTH; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length]);
  }
  return chars.join("");
}

/**
 * Validate that a string looks like a valid join code.
 * Does NOT check database existence.
 */
export function isValidJoinCode(code: string): boolean {
  if (code.length !== JOIN_CODE_LENGTH) return false;
  return /^[A-HJ-KM-NP-Z2-9]{6}$/.test(code);
}

/**
 * Normalize user input: trim, uppercase, strip whitespace/dashes.
 */
export function normalizeJoinCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s\-]/g, "");
}
