import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";

function isFebruary(payrollMonth?: string) {
  return payrollMonth?.trim().toLowerCase().startsWith("feb") ?? false;
}

export function expectedProfessionalTax(state: string, monthlyGross: number, payrollMonth?: string) {
  const normalizedState = state.trim().toLowerCase();

  if (normalizedState === "delhi") return { amount: 0, supported: true };

  if (normalizedState === "maharashtra") {
    if (monthlyGross <= 7500) return { amount: 0, supported: true };
    if (monthlyGross <= 10000) return { amount: 175, supported: true };
    return { amount: isFebruary(payrollMonth) ? 300 : 200, supported: true };
  }

  if (normalizedState === "karnataka") {
    return { amount: monthlyGross >= 25000 ? (isFebruary(payrollMonth) ? 300 : 200) : 0, supported: true };
  }

  if (normalizedState === "tamil nadu") {
    const halfYearGross = monthlyGross * 6;
    if (halfYearGross <= 21000) return { amount: 0, supported: true };
    if (halfYearGross <= 30000) return { amount: Math.round(180 / 6), supported: true };
    if (halfYearGross <= 45000) return { amount: Math.round(425 / 6), supported: true };
    if (halfYearGross <= 60000) return { amount: Math.round(930 / 6), supported: true };
    if (halfYearGross <= 75000) return { amount: Math.round(1025 / 6), supported: true };
    return { amount: Math.round(1250 / 6), supported: true };
  }

  return { amount: undefined, supported: false };
}

export function validatePT(row: PayrollRow, payrollMonth?: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pt = expectedProfessionalTax(row.state, row.grossSalary, payrollMonth);

  if (!pt.supported) {
    results.push({
      compliant: true,
      severity: "info",
      issue: "Professional Tax rules unavailable for selected state.",
      recommendation: "PT slab details are only configured for MH, KA, TN, and DL. Verify manually if applicable."
    });
  } else if (pt.amount !== undefined && Math.abs(row.professionalTax - pt.amount) > 2) {
    results.push({
      compliant: false,
      severity: "warning",
      issue: "Professional Tax deduction does not match the configured state slab.",
      recommendation: `Adjust Professional Tax to Rs. ${pt.amount.toLocaleString("en-IN")} based on the ${row.state} slab.`
    });
  }

  return results;
}
