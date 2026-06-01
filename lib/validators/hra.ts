import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";

export function calculateHraExemption(row: PayrollRow): number {
  if (row.taxRegime === "New") return 0;
  const annualSalaryForHra = (row.basicSalary + row.dearnessAllowance) * 12;
  const actualAnnualHra = row.hraReceived * 12;
  const locationLimit = annualSalaryForHra * (row.metroCity ? 0.5 : 0.4);
  const rentMinusTenPercent = Math.max(0, row.annualRentPaid - annualSalaryForHra * 0.1);
  return Math.round(Math.min(actualAnnualHra, locationLimit, rentMinusTenPercent));
}

export function validateHRA(row: PayrollRow): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  if (row.taxRegime === "New") {
    return []; // Handled by taxRegime validator
  }

  const exemption = calculateHraExemption(row);
  if (exemption > 0) {
    results.push({
      compliant: true,
      severity: "info",
      issue: `Eligible HRA exemption calculated as Rs. ${exemption.toLocaleString("en-IN")}.`,
      recommendation: "Ensure rent receipts and landlord PAN are collected if annual rent exceeds Rs. 1,00,000."
    });
  }

  return results;
}
