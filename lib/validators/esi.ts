import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";
import { getRuleNumber, percentRule } from "@/lib/services/ruleService";
import type { ComplianceRuleMap } from "@/types/payroll";

export function validateESI(row: PayrollRow, rules?: ComplianceRuleMap): ValidationResult[] {
  const results: ValidationResult[] = [];
  const employeeRate = getRuleNumber(rules, "ESI_EMPLOYEE_RATE");
  const employerRate = getRuleNumber(rules, "ESI_EMPLOYER_RATE");
  const esiThreshold = getRuleNumber(rules, "ESI_THRESHOLD");
  const expectedEmployeeEsi = Math.round(row.grossSalary * percentRule(rules, "ESI_EMPLOYEE_RATE"));
  const expectedEmployerEsi = Math.round(row.grossSalary * percentRule(rules, "ESI_EMPLOYER_RATE"));

  if (row.grossSalary <= esiThreshold) {
    if (row.employeeEsi === 0) {
      results.push({
        compliant: false,
        severity: "critical",
        issue: "Employee is ESI eligible, but ESI deduction is missing.",
        recommendation: `Deduct employee ESI at ${employeeRate}% of Gross Salary (Rs. ${expectedEmployeeEsi.toLocaleString("en-IN")}).`
      });
    } else if (Math.abs(row.employeeEsi - expectedEmployeeEsi) > 2) {
      results.push({
        compliant: false,
        severity: "critical",
        issue: `Employee ESI deduction should be ${employeeRate}% of gross salary.`,
        recommendation: `Adjust employee ESI deduction to Rs. ${expectedEmployeeEsi.toLocaleString("en-IN")} (${employeeRate}% of Gross Salary).`
      });
    }

    if (row.employerEsi !== undefined && Math.abs(row.employerEsi - expectedEmployerEsi) > 2) {
      results.push({
        compliant: false,
        severity: "critical",
        issue: `Employer ESI contribution should be ${employerRate}% of gross salary.`,
        recommendation: `Adjust employer ESI contribution to Rs. ${expectedEmployerEsi.toLocaleString("en-IN")} (${employerRate}% of Gross Salary).`
      });
    }
  } else {
    if (row.employeeEsi > 0 || (row.employerEsi ?? 0) > 0) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: "ESI deduction is present even though the employee exceeds the eligibility threshold.",
        recommendation: `Review ESI eligibility because gross monthly salary exceeds Rs. ${esiThreshold.toLocaleString("en-IN")}.`
      });
    }

    results.push({
      compliant: true,
      severity: "info",
      issue: "Employee exceeds ESI eligibility threshold.",
      recommendation: `ESI contribution is not required as gross monthly salary exceeds Rs. ${esiThreshold.toLocaleString("en-IN")}.`
    });
  }

  return results;
}
