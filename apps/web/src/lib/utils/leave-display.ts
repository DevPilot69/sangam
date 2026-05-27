/**
 * Whole-day display for employee leave balances (rounded to the nearest day).
 */
export function wholeLeaveDays(value: number): number {
  return Math.round(Number(value));
}
