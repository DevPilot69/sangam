const STOP_WORDS = new Set([
  'PVT',
  'LTD',
  'LIMITED',
  'LLC',
  'INC',
  'CO',
  'COMPANY',
  'CORP',
  'CORPORATION',
  'THE',
  'AND',
]);

/** Suggest a 2–6 letter company code from the organization name (e.g. Brickred → BR). */
export function suggestCompanyCodeFromName(name: string): string {
  const words = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w));

  if (words.length === 0) return 'ORG';

  if (words.length === 1) {
    const w = words[0];
    return w.length >= 2 ? w.slice(0, 2) : `${w}X`.slice(0, 2);
  }

  return `${words[0][0] ?? ''}${words[1][0] ?? ''}`.slice(0, 6);
}

export function normalizeCompanyCode(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8);
}

export function isValidCompanyCode(code: string): boolean {
  return /^[A-Z0-9]{2,8}$/.test(code);
}

export function buildEmployeeLoginUsername(
  companyCode: string,
  employeeCode: string,
): string {
  return `${normalizeCompanyCode(companyCode)}${employeeCode.trim().toUpperCase()}`;
}

export function buildDefaultOrgPassword(
  companyCode: string,
  keyword: string,
): string {
  return `${normalizeCompanyCode(companyCode)}${keyword}`;
}
