/** Must match API `EMPLOYEE_DEFAULT_PASSWORD_KEYWORD` (default: Vetan). */
export const DEFAULT_PASSWORD_KEYWORD = "Vetan";

export function formatDefaultPassword(companyCode: string): string {
  return `${companyCode.trim().toUpperCase()}${DEFAULT_PASSWORD_KEYWORD}`;
}

export function formatEmployeeLoginUsername(companyCode: string, employeeCode: string): string {
  return `${companyCode.trim().toUpperCase()}${employeeCode.trim().toUpperCase()}`;
}

export function suggestCompanyCodeFromName(name: string): string {
  const stop = new Set(["PVT", "LTD", "LIMITED", "LLC", "INC", "CO", "COMPANY", "CORP", "THE", "AND"]);
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !stop.has(w));
  if (words.length === 0) return "ORG";
  if (words.length === 1) {
    const w = words[0];
    return w.length >= 2 ? w.slice(0, 2) : `${w}X`.slice(0, 2);
  }
  return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.slice(0, 6);
}
