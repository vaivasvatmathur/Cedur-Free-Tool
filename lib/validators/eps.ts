import type { PayrollRow } from "@/types/payroll";
import type { ValidationResult } from "./types";
import { getRuleNumber, percentRule } from "@/lib/services/ruleService";
import type { ComplianceRuleMap } from "@/types/payroll";

export function validateEPS(row: PayrollRow, rules?: ComplianceRuleMap): ValidationResult[] {
  const results: ValidationResult[] = [];
  const pfWage = row.basicSalary + row.dearnessAllowance;
  const epsRate = getRuleNumber(rules, "EPS_RATE");
  const epsMaxAmount = getRuleNumber(rules, "EPS_MAX_AMOUNT");
  const pfThreshold = getRuleNumber(rules, "PF_THRESHOLD");

  if (pfWage <= pfThreshold) {
    const expectedEmployerEps = Math.round(pfWage * percentRule(rules, "EPS_RATE"));
    const isCompliant = Math.abs(row.employerEps - expectedEmployerEps) <= 2;

    if (isCompliant) {
      results.push({
        compliant: true,
        severity: "info",
        issue: "Employer EPS contribution is compliant.",
        recommendation: `Employer EPS contribution matches ${epsRate}% of PF wage.`,
        checkType: "Employer EPS",
        expected: expectedEmployerEps,
        actual: row.employerEps
      });
    } else {
      results.push({
        compliant: false,
        severity: "critical",
        issue: `Employer EPS contribution should be ${epsRate}% of PF wage.`,
        recommendation: `Adjust employer EPS contribution to Rs. ${expectedEmployerEps.toLocaleString("en-IN")} (${epsRate}% of PF wage).`,
        checkType: "Employer EPS",
        expected: expectedEmployerEps,
        actual: row.employerEps
      });
    }
  } else {
    // pfWage > pfThreshold
    const isNotParticipant = row.employeeEpf === 0 && row.employerEpf === 0 && row.employerEps === 0;

    if (isNotParticipant) {
      results.push({
        compliant: true,
        severity: "info",
        issue: "Employer EPS contribution is not required.",
        recommendation: "Employee is not a participant in EPF/EPS (opted out).",
        checkType: "Employer EPS",
        expected: 0,
        actual: row.employerEps
      });
    } else {
      // Participating employee
      const expectedEmployerEps = epsMaxAmount; // capped at Rs. 1,250
      const isCompliant = Math.abs(row.employerEps - expectedEmployerEps) <= 2;

      // Determine method badge for UI consistency
      const expectedCeilingEPF = Math.round(pfThreshold * percentRule(rules, "EPF_EMPLOYEE_RATE"));
      const expectedActualSalaryEPF = Math.round(pfWage * percentRule(rules, "EPF_EMPLOYEE_RATE"));
      const expectedCeilingEmployerEpf = Math.round(pfThreshold * percentRule(rules, "EPF_EMPLOYER_RATE"));
      const expectedActualEmployerEpf = Math.round(pfWage * percentRule(rules, "EPF_EMPLOYER_RATE"));

      const distCeiling = Math.abs(row.employeeEpf - expectedCeilingEPF);
      const distActual = Math.abs(row.employeeEpf - expectedActualSalaryEPF);
      
      let epfMethod: "ceiling" | "actual";
      if (row.employeeEpf > 0) {
        epfMethod = distCeiling < distActual ? "ceiling" : "actual";
      } else {
        const empDistCeiling = Math.abs(row.employerEpf - expectedCeilingEmployerEpf);
        const empDistActual = Math.abs(row.employerEpf - expectedActualEmployerEpf);
        epfMethod = empDistCeiling < empDistActual ? "ceiling" : "actual";
      }

      const contributionType = epfMethod === "ceiling" ? "Ceiling-Based Contribution" : "Actual Wage Contribution";

      if (isCompliant) {
        results.push({
          compliant: true,
          severity: "info",
          issue: "Employer EPS contribution is compliant.",
          recommendation: `Employer EPS contribution matches statutory cap of Rs. ${epsMaxAmount.toLocaleString("en-IN")}.`,
          checkType: "Employer EPS",
          expected: expectedEmployerEps,
          actual: row.employerEps,
          contributionType
        });
      } else {
        results.push({
          compliant: false,
          severity: "critical",
          issue: `Employer EPS contribution does not match the statutory cap of Rs. ${epsMaxAmount.toLocaleString("en-IN")}.`,
          recommendation: `Adjust employer EPS contribution to Rs. ${expectedEmployerEps.toLocaleString("en-IN")} (statutory ceiling).`,
          checkType: "Employer EPS",
          expected: expectedEmployerEps,
          actual: row.employerEps,
          contributionType
        });
      }
    }
  }

  return results;
}
