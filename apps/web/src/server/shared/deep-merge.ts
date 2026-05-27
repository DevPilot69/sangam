/** Deep-merge plain JSON-like objects (no arrays, no Date). Used for tenant settings patches. */
export function deepMergeJson(
  base: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const prev = out[k];
    if (
      v !== null &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      prev !== null &&
      typeof prev === "object" &&
      !Array.isArray(prev)
    ) {
      out[k] = deepMergeJson(
        prev as Record<string, unknown>,
        v as Record<string, unknown>,
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}
