import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";
import { getRuleNumber, percentRule } from "@/lib/services/ruleService";
import type { ComplianceRuleMap } from "@/types/payroll";

export function validateEPF(row: PayrollRow, rules?: ComplianceRuleMap): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pfWage = row.basicSalary + row.dearnessAllowance;
  const employeeRate = getRuleNumber(rules, "EPF_EMPLOYEE_RATE");
  const employerRate = getRuleNumber(rules, "EPF_EMPLOYER_RATE");
  const pfThreshold = getRuleNumber(rules, "PF_THRESHOLD");
  const expectedEmployeeEpf = Math.round(pfWage * percentRule(rules, "EPF_EMPLOYEE_RATE"));
  const expectedEmployerEpf = Math.round(pfWage * percentRule(rules, "EPF_EMPLOYER_RATE"));

  if (pfWage <= pfThreshold) {
    if (row.employeeEpf === 0) {
      results.push({
        compliant: false,
        severity: "critical",
        issue: `PF is mandatory when Basic + DA is Rs. ${pfThreshold.toLocaleString("en-IN")} or below, but employee EPF is missing.`,
        recommendation: `Deduct employee EPF at ${employeeRate}% (Rs. ${expectedEmployeeEpf.toLocaleString("en-IN")}) from Basic + DA.`
      });
    } else if (Math.abs(row.employeeEpf - expectedEmployeeEpf) > 2) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: `Employee EPF deduction should be ${employeeRate}% of Basic + DA.`,
        recommendation: `Adjust employee EPF deduction to Rs. ${expectedEmployeeEpf.toLocaleString("en-IN")} (${employeeRate}% of PF wage).`
      });
    }
  } else {
    results.push({
      compliant: true,
      severity: "info",
      issue: `PF contribution may be voluntary because Basic + DA exceeds Rs. ${pfThreshold.toLocaleString("en-IN")}.`,
      recommendation: `PF contribution is optional for wages above Rs. ${pfThreshold.toLocaleString("en-IN")} under configured statutory rules.`
    });

    if (row.employeeEpf > 0 && Math.abs(row.employeeEpf - expectedEmployeeEpf) > 2) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: `Voluntary Employee EPF deduction should be ${employeeRate}% of Basic + DA when PF is deducted.`,
        recommendation: `Review voluntary EPF setup or adjust employee EPF deduction to Rs. ${expectedEmployeeEpf.toLocaleString("en-IN")}.`
      });
    }
  }

  if ((pfWage <= pfThreshold || row.employerEpf > 0) && Math.abs(row.employerEpf - expectedEmployerEpf) > 2) {
    results.push({
      compliant: false,
      severity: "warning",
      issue: `Employer EPF contribution should be ${employerRate}% of Basic + DA.`,
      recommendation: `Adjust employer EPF contribution to Rs. ${expectedEmployerEpf.toLocaleString("en-IN")} (${employerRate}% of PF wage).`
    });
  }

  return results;
}
