export function suggestCodeFromName(name: string): string {
  const raw = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  if (!raw) return "DEPT";
  const first = raw.replace(/^[^A-Z0-9]+/, "");
  return (first[0]?.match(/[A-Z0-9]/) ? first : `D${raw}`).slice(0, 32);
}
