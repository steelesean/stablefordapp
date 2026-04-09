/**
 * Compares a caller-supplied admin key to the ADMIN_KEY env var.
 * Constant-time comparison to avoid trivial timing leaks.
 */
export function isAdmin(key: string | null | undefined): boolean {
  const expected = process.env.ADMIN_KEY ?? "";
  if (!expected) return false;
  if (!key) return false;
  if (key.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ key.charCodeAt(i);
  }
  return mismatch === 0;
}
