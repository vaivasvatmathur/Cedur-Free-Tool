import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";

export function validateTaxRegime(row: PayrollRow): ValidationResult[] {
  const results: ValidationResult[] = [];

  if (row.taxRegime === "New") {
    results.push({
      compliant: false, // The prompt notes HRA exemption is 0, warning of HRA benefits being not available
      severity: "warning",
      issue: "HRA exemption benefits are not available under the New Tax Regime.",
      recommendation: "HRA benefits are restricted under the New Tax Regime. Ensure tax computations do not deduct HRA."
    });
  }

  return results;
}
