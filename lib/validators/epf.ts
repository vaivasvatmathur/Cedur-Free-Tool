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

  const expectedActualSalaryEPF = Math.round(pfWage * percentRule(rules, "EPF_EMPLOYEE_RATE"));
  const expectedCeilingEPF = Math.round(Math.min(pfWage, pfThreshold) * percentRule(rules, "EPF_EMPLOYEE_RATE"));

  const expectedActualEmployerEpf = Math.round(pfWage * percentRule(rules, "EPF_EMPLOYER_RATE"));
  const expectedCeilingEmployerEpf = Math.round(Math.min(pfWage, pfThreshold) * percentRule(rules, "EPF_EMPLOYER_RATE"));

  // 1. Employee EPF Validation
  if (pfWage <= pfThreshold) {
    if (row.employeeEpf === 0) {
      results.push({
        compliant: false,
        severity: "critical",
        issue: `PF is mandatory when Basic + DA is Rs. ${pfThreshold.toLocaleString("en-IN")} or below, but employee EPF is missing.`,
        recommendation: `Deduct employee EPF at ${employeeRate}% (Rs. ${expectedActualSalaryEPF.toLocaleString("en-IN")}) from Basic + DA.`,
        checkType: "Employee EPF",
        expected: expectedActualSalaryEPF,
        actual: row.employeeEpf
      });
    } else if (Math.abs(row.employeeEpf - expectedActualSalaryEPF) > 2) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: `Employee EPF deduction should be ${employeeRate}% of Basic + DA.`,
        recommendation: `Adjust employee EPF deduction to Rs. ${expectedActualSalaryEPF.toLocaleString("en-IN")} (${employeeRate}% of PF wage).`,
        checkType: "Employee EPF",
        expected: expectedActualSalaryEPF,
        actual: row.employeeEpf
      });
    } else {
      results.push({
        compliant: true,
        severity: "info",
        issue: "EPF contribution calculated on actual PF wage.",
        recommendation: "EPF contribution matches 12% of actual PF wage.",
        checkType: "Employee EPF",
        expected: expectedActualSalaryEPF,
        actual: row.employeeEpf
      });
    }
  } else {
    // pfWage > pfThreshold
    const isNotParticipant = row.employeeEpf === 0 && row.employerEpf === 0 && row.employerEps === 0;

    if (isNotParticipant) {
      results.push({
        compliant: true,
        severity: "info",
        issue: "Employee is not a participant in EPF (opted out).",
        recommendation: "EPF contribution is not required for starting wages above the statutory ceiling.",
        checkType: "Employee EPF",
        expected: 0,
        actual: row.employeeEpf
      });
    } else {
      // Participating employee
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
      const expectedEPF = epfMethod === "ceiling" ? expectedCeilingEPF : expectedActualSalaryEPF;

      const isEPFCompliant = Math.abs(row.employeeEpf - expectedEPF) <= 2;

      if (isEPFCompliant) {
        results.push({
          compliant: true,
          severity: "info",
          issue: epfMethod === "ceiling"
            ? "Contribution follows statutory PF wage ceiling."
            : "EPF contribution calculated on actual PF wage.",
          recommendation: epfMethod === "ceiling"
            ? `EPF contribution is capped at the statutory PF wage ceiling of Rs. ${pfThreshold.toLocaleString("en-IN")}.`
            : `EPF contribution matches ${employeeRate}% of actual PF wage.`,
          checkType: "Employee EPF",
          expected: expectedEPF,
          actual: row.employeeEpf,
          contributionType
        });
      } else {
        results.push({
          compliant: false,
          severity: "warning",
          issue: epfMethod === "ceiling"
            ? "Employee EPF contribution does not match statutory ceiling basis."
            : "Employee EPF contribution does not match actual salary basis.",
          recommendation: epfMethod === "ceiling"
            ? `EPF contribution must match statutory ceiling (Rs. ${expectedCeilingEPF.toLocaleString("en-IN")}).`
            : `EPF contribution must match ${employeeRate}% of actual PF wage (Rs. ${expectedActualSalaryEPF.toLocaleString("en-IN")}).`,
          checkType: "Employee EPF",
          expected: expectedEPF,
          actual: row.employeeEpf,
          contributionType
        });
      }
    }
  }

  // 2. Employer EPF Validation
  if (pfWage <= pfThreshold) {
    if (row.employerEpf === 0) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: "Employer EPF contribution is missing for a mandatory EPF employee.",
        recommendation: `Contribute employer EPF at ${employerRate}% (Rs. ${expectedActualEmployerEpf.toLocaleString("en-IN")}).`,
        checkType: "Employer EPF",
        expected: expectedActualEmployerEpf,
        actual: row.employerEpf
      });
    } else if (Math.abs(row.employerEpf - expectedActualEmployerEpf) > 2) {
      results.push({
        compliant: false,
        severity: "warning",
        issue: `Employer EPF contribution should be ${employerRate}% of Basic + DA.`,
        recommendation: `Adjust employer EPF contribution to Rs. ${expectedActualEmployerEpf.toLocaleString("en-IN")} (${employerRate}% of PF wage).`,
        checkType: "Employer EPF",
        expected: expectedActualEmployerEpf,
        actual: row.employerEpf
      });
    } else {
      results.push({
        compliant: true,
        severity: "info",
        issue: "Employer EPF matching matches 3.67% of actual PF wage.",
        recommendation: "Employer EPF matching is correct.",
        checkType: "Employer EPF",
        expected: expectedActualEmployerEpf,
        actual: row.employerEpf
      });
    }
  } else {
    // pfWage > pfThreshold
    const isNotParticipant = row.employeeEpf === 0 && row.employerEpf === 0 && row.employerEps === 0;

    if (isNotParticipant) {
      results.push({
        compliant: true,
        severity: "info",
        issue: "Employer EPF contribution is not required.",
        recommendation: "Employee is not a participant in EPF (opted out).",
        checkType: "Employer EPF",
        expected: 0,
        actual: row.employerEpf
      });
    } else {
      // Participating employee
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
      const expectedEmployerEPF = epfMethod === "ceiling" ? expectedCeilingEmployerEpf : expectedActualEmployerEpf;

      const isEmployerEPFCompliant = Math.abs(row.employerEpf - expectedEmployerEPF) <= 2;

      if (row.employerEpf === 0) {
        results.push({
          compliant: false,
          severity: "warning",
          issue: "Employer EPF contribution is missing for an active EPF employee.",
          recommendation: epfMethod === "ceiling"
            ? `Contribute employer EPF at statutory ceiling (Rs. ${expectedCeilingEmployerEpf.toLocaleString("en-IN")}).`
            : `Contribute employer EPF on actual wage (Rs. ${expectedActualEmployerEpf.toLocaleString("en-IN")}).`,
          checkType: "Employer EPF",
          expected: expectedEmployerEPF,
          actual: row.employerEpf,
          contributionType
        });
      } else if (isEmployerEPFCompliant) {
        results.push({
          compliant: true,
          severity: "info",
          issue: epfMethod === "ceiling"
            ? "Employer EPF matching follows statutory PF wage ceiling."
            : "Employer EPF matching calculated on actual PF wage.",
          recommendation: epfMethod === "ceiling"
            ? `Employer EPF contribution is capped at the statutory matching ceiling of Rs. ${expectedCeilingEmployerEpf.toLocaleString("en-IN")}.`
            : `Employer EPF contribution matches ${employerRate}% of actual PF wage.`,
          checkType: "Employer EPF",
          expected: expectedEmployerEPF,
          actual: row.employerEpf,
          contributionType
        });
      } else {
        results.push({
          compliant: false,
          severity: "warning",
          issue: epfMethod === "ceiling"
            ? "Employer EPF contribution does not match statutory ceiling basis."
            : "Employer EPF contribution does not match actual salary basis.",
          recommendation: epfMethod === "ceiling"
            ? `Adjust employer EPF contribution to Rs. ${expectedCeilingEmployerEpf.toLocaleString("en-IN")} (ceiling).`
            : `Adjust employer EPF contribution to Rs. ${expectedActualEmployerEpf.toLocaleString("en-IN")} (${employerRate}% of actual wage).`,
          checkType: "Employer EPF",
          expected: expectedEmployerEPF,
          actual: row.employerEpf,
          contributionType
        });
      }
    }
  }

  return results;
}
