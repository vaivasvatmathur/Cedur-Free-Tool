import type {
  ComplianceIssue,
  ComplianceResult,
  CompanyInfo,
  EmployeeComplianceLog,
  EmployeeFinding,
  PayrollRow,
  Severity
} from "@/types/payroll";
import { validateEPF } from "./validators/epf";
import { validateEPS } from "./validators/eps";
import { validateESI } from "./validators/esi";
import { validatePT, expectedProfessionalTax } from "./validators/pt";
import { validateHRA, calculateHraExemption } from "./validators/hra";
import { validateTaxRegime } from "./validators/taxRegime";
import { getCachedPTRules, getCachedRuleMap, getRuleNumber, percentRule } from "@/lib/services/ruleService";
import type { ComplianceRuleMap, PTRule } from "@/types/payroll";
import { calculatePayrollHealthScore } from "@/lib/compliance-score";

const round = (value: number) => Math.round(value);

const REQUIRED_UPLOAD_COLUMNS = [
  "Employee ID",
  "Employee Name",
  "State",
  "Basic Salary",
  "Dearness Allowance (DA)",
  "Gross Salary",
  "HRA Received",
  "Annual Rent Paid",
  "Metro City",
  "Employee EPF Deduction",
  "Employer EPF Contribution",
  "Employer EPS Contribution",
  "Employee ESI Deduction",
  "Professional Tax Deduction",
  "Tax Regime"
] as const;

export const requiredUploadColumns = [...REQUIRED_UPLOAD_COLUMNS];

export type ValidationOptions = {
  payrollMonth?: string;
  rules?: ComplianceRuleMap;
  ptRules?: PTRule[];
};

export function validateRequiredColumns(headers: string[]) {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  return requiredUploadColumns.filter((column) => !normalizedHeaders.has(normalizeHeader(column)));
}

export function normalizeHeader(header: string) {
  return header.toLowerCase().trim().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function mapSeverity(sev: "critical" | "warning" | "info"): Severity {
  if (sev === "critical") return "Critical";
  if (sev === "warning") return "Warning";
  return "Info";
}

export function validatePayroll(rows: PayrollRow[], options: ValidationOptions = {}): ComplianceResult {
  const issues: ComplianceIssue[] = [];
  const findings: EmployeeFinding[] = [];
  const rules = options.rules ?? getCachedRuleMap();
  const ptRules = options.ptRules ?? getCachedPTRules();

  for (const row of rows) {
    if (!row.employeeId || !row.employeeName || !row.state) {
      issues.push({
        employeeId: row.employeeId || "UNKNOWN",
        employeeName: row.employeeName || "UNKNOWN",
        category: "Data Quality",
        severity: "Critical",
        message: "Required employee identity or state fields are missing."
      });
    }

        const pfWage = row.basicSalary + row.dearnessAllowance;
    const esiThreshold = getRuleNumber(rules, "ESI_THRESHOLD");
    const epsMaxAmount = getRuleNumber(rules, "EPS_MAX_AMOUNT");
    const pfThreshold = getRuleNumber(rules, "PF_THRESHOLD");

    let expectedEmployeeEpf = 0;
    let expectedEmployerEpf = 0;
    let expectedEmployerEps = 0;

    const isNotParticipant = pfWage > pfThreshold && row.employeeEpf === 0 && row.employerEpf === 0 && row.employerEps === 0;

    if (isNotParticipant) {
      expectedEmployeeEpf = 0;
      expectedEmployerEpf = 0;
      expectedEmployerEps = 0;
    } else if (pfWage <= pfThreshold) {
      expectedEmployeeEpf = round(pfWage * percentRule(rules, "EPF_EMPLOYEE_RATE"));
      expectedEmployerEpf = round(pfWage * percentRule(rules, "EPF_EMPLOYER_RATE"));
      expectedEmployerEps = round(pfWage * percentRule(rules, "EPS_RATE"));
    } else {
      // pfWage > pfThreshold and participating
      const expectedCeilingEPF = round(pfThreshold * percentRule(rules, "EPF_EMPLOYEE_RATE"));
      const expectedActualSalaryEPF = round(pfWage * percentRule(rules, "EPF_EMPLOYEE_RATE"));
      const expectedCeilingEmployerEpf = round(pfThreshold * percentRule(rules, "EPF_EMPLOYER_RATE"));
      const expectedActualEmployerEpf = round(pfWage * percentRule(rules, "EPF_EMPLOYER_RATE"));

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

      if (epfMethod === "ceiling") {
        expectedEmployeeEpf = expectedCeilingEPF;
        expectedEmployerEpf = expectedCeilingEmployerEpf;
        expectedEmployerEps = epsMaxAmount;
      } else {
        expectedEmployeeEpf = expectedActualSalaryEPF;
        expectedEmployerEpf = expectedActualEmployerEpf;
        expectedEmployerEps = epsMaxAmount;
      }
    }

    const expectedEmployeeEsi = round(row.grossSalary * percentRule(rules, "ESI_EMPLOYEE_RATE"));
    const expectedEmployerEsi = round(row.grossSalary * percentRule(rules, "ESI_EMPLOYER_RATE"));
    const pt = expectedProfessionalTax(row.state, row.grossSalary, ptRules);
    const hraExemption = calculateHraExemption(row, rules);

    findings.push({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      pfWage,
      expectedEmployeeEpf,
      expectedEmployerEpf,
      expectedEmployerEps,
      expectedEmployeeEsi: row.grossSalary <= esiThreshold ? expectedEmployeeEsi : 0,
      expectedEmployerEsi: row.grossSalary <= esiThreshold ? expectedEmployerEsi : 0,
      expectedProfessionalTax: pt.amount,
      hraExemption
    });

    const epfResults = validateEPF(row, rules);
    epfResults.forEach((res) => {
      issues.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        category: "EPF",
        severity: mapSeverity(res.severity),
        message: res.issue,
        expected: res.expected,
        actual: res.actual,
        checkType: res.checkType,
        contributionType: res.contributionType
      });
    });

    const epsResults = validateEPS(row, rules);
    epsResults.forEach((res) => {
      issues.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        category: "EPS",
        severity: mapSeverity(res.severity),
        message: res.issue,
        expected: res.expected,
        actual: res.actual,
        checkType: res.checkType,
        contributionType: res.contributionType
      });
    });

    const esiResults = validateESI(row, rules);
    esiResults.forEach((res) => {
      let exp: number | undefined;
      let act: number | undefined;
      if (res.issue.includes("missing") || res.issue.includes("Employee ESI deduction")) {
        exp = expectedEmployeeEsi;
        act = row.employeeEsi;
      } else if (res.issue.includes("Employer ESI contribution")) {
        exp = expectedEmployerEsi;
        act = row.employerEsi;
      }
      issues.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        category: "ESI",
        severity: mapSeverity(res.severity),
        message: res.issue,
        expected: exp,
        actual: act
      });
    });

    const ptResults = validatePT(row, ptRules);
    ptResults.forEach((res) => {
      issues.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        category: "Professional Tax",
        severity: mapSeverity(res.severity),
        message: res.issue,
        expected: pt.amount,
        actual: row.professionalTax
      });
    });

    const hraResults = validateHRA(row, rules);
    hraResults.forEach((res) => {
      issues.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        category: "HRA",
        severity: mapSeverity(res.severity),
        message: res.issue,
        expected: hraExemption,
        actual: hraExemption
      });
    });

    const regimeResults = validateTaxRegime(row);
    regimeResults.forEach((res) => {
      issues.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        category: "Tax Regime",
        severity: mapSeverity(res.severity),
        message: res.issue,
        expected: 0,
        actual: hraExemption
      });
    });
  }

  const byEmployee = new Map<string, ComplianceIssue[]>();
  for (const issue of issues) {
    byEmployee.set(issue.employeeId, [...(byEmployee.get(issue.employeeId) ?? []), issue]);
  }

  const employeeLogs: EmployeeComplianceLog[] = rows.map((row) => {
    const employeeIssues = byEmployee.get(row.employeeId) ?? [];
    const primaryIssue = employeeIssues.find((issue) => issue.severity === "Critical") ?? employeeIssues.find((issue) => issue.severity === "Warning") ?? employeeIssues[0];
    const hasCritical = employeeIssues.some((issue) => issue.severity === "Critical");
    const hasWarning = employeeIssues.some((issue) => issue.severity === "Warning");
    return {
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      department: row.department,
      grossSalary: row.grossSalary,
      issue: primaryIssue ? `${primaryIssue.category}: ${primaryIssue.message}` : "No issues detected",
      issueCount: employeeIssues.length,
      severity: hasCritical ? "Critical" : hasWarning ? "Warning" : employeeIssues.length ? "Info" : "Clear",
      status: hasCritical ? "Non-Compliant" : hasWarning ? "Review" : "Compliant"
    };
  });
  let passedChecks = 0;
  let warningChecks = 0;
  let failedChecks = 0;

  for (const row of rows) {
    const empId = row.employeeId;
    const empIssues = issues.filter((issue) => issue.employeeId === empId);

    const evaluateCheck = (checkIssues: ComplianceIssue[]) => {
      const hasCritical = checkIssues.some((i) => i.severity === "Critical");
      const hasWarning = checkIssues.some((i) => i.severity === "Warning");
      if (hasCritical) {
        failedChecks++;
      } else if (hasWarning) {
        warningChecks++;
      } else {
        passedChecks++;
      }
    };

    // 1. Employee EPF Check
    evaluateCheck(empIssues.filter((i) => i.category === "EPF" && i.checkType === "Employee EPF"));
    // 2. Employer EPF Check
    evaluateCheck(empIssues.filter((i) => i.category === "EPF" && i.checkType === "Employer EPF"));
    // 3. Employer EPS Check
    evaluateCheck(empIssues.filter((i) => i.category === "EPS" && i.checkType === "Employer EPS"));
    // 4. ESI Check
    evaluateCheck(empIssues.filter((i) => i.category === "ESI"));
    // 5. Professional Tax Check
    evaluateCheck(empIssues.filter((i) => i.category === "Professional Tax"));
    // 6. HRA Check
    evaluateCheck(empIssues.filter((i) => i.category === "HRA"));
    // 7. Tax Regime Check
    evaluateCheck(empIssues.filter((i) => i.category === "Tax Regime"));
  }

  const score = calculatePayrollHealthScore(passedChecks, warningChecks, failedChecks);

  const criticalCount = employeeLogs.filter((log) => log.status === "Non-Compliant").length;
  const warningCount = employeeLogs.filter((log) => log.status === "Review").length;
  const compliantEmployees = employeeLogs.filter((log) => log.status === "Compliant").length;
  const infoCount = issues.filter((issue) => issue.severity === "Info").length;

  return {
    score,
    totalEmployees: rows.length,
    compliantEmployees,
    issueCount: issues.length,
    criticalCount,
    warningCount,
    infoCount,
    issues,
    employeeLogs,
    findings,
    recommendations: buildRecommendations(issues, rules)
  };
}

function buildRecommendations(issues: ComplianceIssue[], rules: ComplianceRuleMap) {
  const recommendations: string[] = [];
  const count = (category: ComplianceIssue["category"], severity?: Severity) =>
    issues.filter((issue) => issue.category === category && (!severity || issue.severity === severity)).length;

  const epfIssues = count("EPF", "Critical");
  const epsIssues = count("EPS", "Critical");
  const esiMissing = issues.filter((issue) => issue.category === "ESI" && issue.message.includes("missing")).length;
  const hraIssues = count("HRA") + count("Tax Regime");
  const ptIssues = count("Professional Tax", "Warning");

  if (epfIssues) recommendations.push(`Update employee EPF contribution for ${epfIssues} detected critical EPF issue${epfIssues > 1 ? "s" : ""}.`);
  if (epsIssues) recommendations.push(`Review employer EPS allocation for ${epsIssues} employee${epsIssues > 1 ? "s" : ""}; EPS is capped at Rs. ${getRuleNumber(rules, "EPS_MAX_AMOUNT").toLocaleString("en-IN")}.`);
  if (esiMissing) recommendations.push(`${esiMissing} employee${esiMissing > 1 ? "s are" : " is"} eligible for ESI but no deduction was found.`);
  if (ptIssues) recommendations.push(`Recheck Professional Tax slabs for ${ptIssues} employee${ptIssues > 1 ? "s" : ""} in supported states.`);
  if (hraIssues) recommendations.push("Review HRA structure under the selected tax regime before issuing tax declarations.");
  if (!recommendations.length) recommendations.push("Payroll compliance looks healthy. Continue monthly validation before processing payroll.");

  return recommendations.slice(0, 5);
}

export function defaultCompanyInfo(): CompanyInfo {
  return {
    companyName: "",
    state: "Maharashtra",
    payrollMonth: "May",
    financialYear: "2026-27"
  };
}
