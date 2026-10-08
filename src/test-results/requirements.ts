/**
 * Declares the requirements a test file proves; the testdoc adapters read the literal call from source.
 * @param map requirement id to its one-line text, string literals only
 * @returns the same map, frozen
 */
export function requirements(map: Record<string, string>): Readonly<Record<string, string>> {
  return Object.freeze({ ...map });
}
