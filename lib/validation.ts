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
    const expectedEmployeeEpf = round(pfWage * percentRule(rules, "EPF_EMPLOYEE_RATE"));
    const expectedEmployerEpf = round(pfWage * percentRule(rules, "EPF_EMPLOYER_RATE"));
    const expectedEmployerEps = round(Math.min(pfWage * percentRule(rules, "EPS_RATE"), epsMaxAmount));
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
      let exp: number | undefined;
      let act: number | undefined;
      if (res.issue.includes("mandatory")) {
        exp = expectedEmployeeEpf;
        act = row.employeeEpf;
      } else if (res.issue.includes("Employee EPF deduction")) {
        exp = expectedEmployeeEpf;
        act = row.employeeEpf;
      } else if (res.issue.includes("Employer EPF contribution")) {
        exp = expectedEmployerEpf;
        act = row.employerEpf;
      }

      issues.push({
        employeeId: row.employeeId,
        employeeName: row.employeeName,
        category: "EPF",
        severity: mapSeverity(res.severity),
        message: res.issue,
        expected: exp,
        actual: act
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
        expected: expectedEmployerEps,
        actual: row.employerEps
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

  const criticalCount = issues.filter((issue) => issue.severity === "Critical").length;
  const warningCount = issues.filter((issue) => issue.severity === "Warning").length;
  const infoCount = issues.filter((issue) => issue.severity === "Info").length;
  const score = Math.max(0, Math.min(100, 100 - criticalCount * 10 - warningCount * 5 - infoCount * 2));
  const compliantEmployees = employeeLogs.filter((log) => log.status === "Compliant").length;

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
