import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";

export function validateESI(row: PayrollRow): ValidationResult[] {
  const results: ValidationResult[] = [];
  const expectedEmployeeEsi = Math.round(row.grossSalary * 0.0075);

  if (row.grossSalary <= 21000) {
    if (row.employeeEsi === 0) {
      results.push({
        compliant: false,
        severity: "critical",
        issue: "Employee is ESI eligible, but ESI deduction is missing.",
        recommendation: `Deduct employee ESI at 0.75% of Gross Salary (Rs. ${expectedEmployeeEsi.toLocaleString("en-IN")}).`
      });
    } else if (Math.abs(row.employeeEsi - expectedEmployeeEsi) > 2) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: "Employee ESI deduction should be 0.75% of gross salary.",
        recommendation: `Adjust employee ESI deduction to Rs. ${expectedEmployeeEsi.toLocaleString("en-IN")} (0.75% of Gross Salary).`
      });
    }
  } else {
    results.push({
      compliant: true,
      severity: "info",
      issue: "Employee exceeds ESI eligibility threshold.",
      recommendation: "ESI contribution is not required as gross monthly salary exceeds Rs. 21,000."
    });
  }

  return results;
}
