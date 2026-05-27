export function formatCurrency(amount: number): string {
  return `₹ ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function formatPAN(pan: string): string {
  const s = pan.replace(/\s/g, "").toUpperCase();
  if (s.length < 5) return s;
  return `${s.slice(0, 2)}****${s.slice(-3)}`;
}

export function formatAadhaar(aadhaar: string): string {
  const d = aadhaar.replace(/\D/g, "");
  if (d.length < 4) return aadhaar;
  return `XXXX XXXX ${d.slice(-4)}`;
}

export function formatAccountNumber(acc: string): string {
  const d = acc.replace(/\s/g, "");
  if (d.length <= 4) return d;
  return `···· ${d.slice(-4)}`;
}

export function formatEmployeeId(id: string): string {
  if (id.startsWith("EMP")) return id;
  return `EMP-${id.padStart(3, "0")}`;
}

export function formatLakhAbbrev(amount: number): string {
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  if (amount >= 1000) {
    return `₹${(amount / 1000).toFixed(1)}K`;
  }
  return formatCurrency(amount);
}
