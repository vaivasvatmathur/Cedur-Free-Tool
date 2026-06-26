export function calculatePayrollHealthScore(passed: number, warning: number, failed: number) {
  const total = passed + warning + failed;
  if (!total) return 0;
  return Math.round(((passed * 1.0 + warning * 0.5 + failed * 0.0) / total) * 100);
}

export type HealthStatus = {
  label: "Excellent" | "Good" | "Needs Review" | "High Risk";
  colorClass: string;
  ringColor: string;
};

export function getHealthStatus(score: number): HealthStatus {
  if (score >= 90) {
    return { label: "Excellent", colorClass: "text-emerald-600", ringColor: "#10b981" };
  }
  if (score >= 75) {
    return { label: "Good", colorClass: "text-blue-600", ringColor: "#3b82f6" };
  }
  if (score >= 50) {
    return { label: "Needs Review", colorClass: "text-amber-600", ringColor: "#f59e0b" };
  }
  return { label: "High Risk", colorClass: "text-red-600", ringColor: "#ef4444" };
}

export const PAYROLL_HEALTH_SCORE_TOOLTIP =
  "Payroll Health Score represents the percentage of compliance validation checks passed across all statutory modules.";
