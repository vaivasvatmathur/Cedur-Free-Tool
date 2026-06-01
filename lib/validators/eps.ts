import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";

export function validateEPS(row: PayrollRow): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pfWage = row.basicSalary + row.dearnessAllowance;
  const expectedEmployerEps = Math.round(Math.min(pfWage * 0.0833, 1250));

  if (Math.abs(row.employerEps - expectedEmployerEps) > 2) {
    results.push({
      compliant: false,
      severity: "critical",
      issue: "Employer EPS contribution should be 8.33% of PF wage, capped at Rs. 1,250.",
      recommendation: `Adjust employer EPS contribution to Rs. ${expectedEmployerEps.toLocaleString("en-IN")} (8.33% of PF wage capped at Rs. 1,250).`
    });
  }

  return results;
}
