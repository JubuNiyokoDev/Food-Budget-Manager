export function formatFBu(amount: number | null | undefined): string {
  if (amount == null) return "0 FBu";
  const rounded = Math.round(amount);
  const formatted = rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
  return `${formatted} FBu`;
}

export function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u00A0");
}

export function getProgressColor(pct: number): string {
  if (pct >= 85) return "bg-red-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-green-500";
}

export function getProgressColorHex(pct: number): string {
  if (pct >= 85) return "#ef4444";
  if (pct >= 60) return "#f59e0b";
  return "#22c55e";
}

export function getStatusLabel(pct: number, started: boolean): { label: string; color: string } {
  if (!started) return { label: "Pas commencé", color: "text-gray-400" };
  if (pct > 100) return { label: "Dépassé", color: "text-red-500" };
  if (pct >= 80) return { label: "Partiel", color: "text-amber-500" };
  return { label: "OK", color: "text-green-500" };
}

export function getMoisLabel(mois: string): string {
  const [year, month] = mois.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

export function getMoisCurrent(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

export function getStatusColor(pct: number): string {
  if (pct >= 85) return "bg-red-500";
  if (pct >= 60) return "bg-amber-500";
  return "bg-green-500";
}
