import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";
import { percentRule } from "@/lib/services/ruleService";
import type { ComplianceRuleMap } from "@/types/payroll";

export function calculateHraExemption(row: PayrollRow, rules?: ComplianceRuleMap): number {
  if (row.taxRegime === "New") return 0;
  const annualSalaryForHra = (row.basicSalary + row.dearnessAllowance) * 12;
  const actualAnnualHra = row.hraReceived * 12;
  const locationLimit = annualSalaryForHra * (row.metroCity ? percentRule(rules, "HRA_METRO_PERCENT") : percentRule(rules, "HRA_NON_METRO_PERCENT"));
  const rentMinusTenPercent = Math.max(0, row.annualRentPaid - annualSalaryForHra * percentRule(rules, "HRA_RENT_DEDUCTION_PERCENT"));
  return Math.round(Math.min(actualAnnualHra, locationLimit, rentMinusTenPercent));
}

export function validateHRA(row: PayrollRow, rules?: ComplianceRuleMap): ValidationResult[] {
  const results: ValidationResult[] = [];
  
  if (row.taxRegime === "New") {
    return [];
  }

  const exemption = calculateHraExemption(row, rules);
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
