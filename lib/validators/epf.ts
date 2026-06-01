import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";

export function validateEPF(row: PayrollRow): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pfWage = row.basicSalary + row.dearnessAllowance;
  const expectedEmployeeEpf = Math.round(pfWage * 0.12);
  const expectedEmployerEpf = Math.round(pfWage * 0.0367);

  // 1. Employee EPF Deduction mismatch
  if (Math.abs(row.employeeEpf - expectedEmployeeEpf) > 2) {
    results.push({
      compliant: false,
      severity: "critical",
      issue: "Employee EPF deduction must be 12% of Basic + DA.",
      recommendation: `Adjust employee EPF deduction to Rs. ${expectedEmployeeEpf.toLocaleString("en-IN")} (12% of PF wage).`
    });
  }

  // 2. PF Applicability (mandatory if wage <= 15,000)
  if (pfWage <= 15000) {
    if (row.employeeEpf === 0) {
      results.push({
        compliant: false,
        severity: "critical",
        issue: "PF is mandatory when Basic + DA is Rs. 15,000 or below, but employee EPF is missing.",
        recommendation: `Deduct employee EPF at 12% (Rs. ${expectedEmployeeEpf.toLocaleString("en-IN")}) from Basic + DA.`
      });
    }
  } else {
    // PF Wage > 15,000
    results.push({
      compliant: true,
      severity: "info",
      issue: "PF contribution may be voluntary because Basic + DA exceeds Rs. 15,000.",
      recommendation: "PF contribution is optional for wages above Rs. 15,000 under statutory rules."
    });
  }

  // 3. Employer EPF validation
  if (Math.abs(row.employerEpf - expectedEmployerEpf) > 2) {
    results.push({
      compliant: false,
      severity: "warning",
      issue: "Employer EPF contribution should be 3.67% of Basic + DA.",
      recommendation: `Adjust employer EPF contribution to Rs. ${expectedEmployerEpf.toLocaleString("en-IN")} (3.67% of PF wage).`
    });
  }

  return results;
}
