/** Returns a short unique suffix for test data, safe for parallel runs. */
export function uniqueSuffix(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
