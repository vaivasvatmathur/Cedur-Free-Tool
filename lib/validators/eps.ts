import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";
import { getRuleNumber, percentRule } from "@/lib/services/ruleService";
import type { ComplianceRuleMap } from "@/types/payroll";

export function validateEPS(row: PayrollRow, rules?: ComplianceRuleMap): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pfWage = row.basicSalary + row.dearnessAllowance;
  const epsRate = getRuleNumber(rules, "EPS_RATE");
  const epsMaxAmount = getRuleNumber(rules, "EPS_MAX_AMOUNT");
  const expectedEmployerEps = Math.round(Math.min(pfWage * percentRule(rules, "EPS_RATE"), epsMaxAmount));

  if (Math.abs(row.employerEps - expectedEmployerEps) > 2) {
    results.push({
      compliant: false,
      severity: "critical",
      issue: `Employer EPS contribution should be ${epsRate}% of PF wage, capped at Rs. ${epsMaxAmount.toLocaleString("en-IN")}.`,
      recommendation: `Adjust employer EPS contribution to Rs. ${expectedEmployerEps.toLocaleString("en-IN")} (${epsRate}% of PF wage capped at Rs. ${epsMaxAmount.toLocaleString("en-IN")}).`
    });
  }

  return results;
}
