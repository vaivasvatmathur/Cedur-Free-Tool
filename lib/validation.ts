import type {
  ComplianceIssue,
  ComplianceResult,
  CompanyInfo,
  EmployeeComplianceLog,
  EmployeeFinding,
  PayrollRow,
  Severity
} from "@/types/payroll";

const round = (value: number) => Math.round(value);
const nearlyEqual = (actual: number, expected: number) => Math.abs(actual - expected) <= 2;

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
};

function pushIssue(
  issues: ComplianceIssue[],
  row: PayrollRow,
  category: ComplianceIssue["category"],
  severity: Severity,
  message: string,
  expected?: number,
  actual?: number
) {
  issues.push({
    employeeId: row.employeeId,
    employeeName: row.employeeName,
    category,
    severity,
    message,
    expected,
    actual
  });
}

function isFebruary(month?: string) {
  return month?.trim().toLowerCase().startsWith("feb") ?? false;
}

export function validateRequiredColumns(headers: string[]) {
  const normalizedHeaders = new Set(headers.map(normalizeHeader));
  return requiredUploadColumns.filter((column) => !normalizedHeaders.has(normalizeHeader(column)));
}

export function normalizeHeader(header: string) {
  return header.toLowerCase().trim().replace(/\(.*?\)/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

export function expectedProfessionalTax(state: string, monthlyGross: number, payrollMonth?: string) {
  const normalizedState = state.trim().toLowerCase();

  if (normalizedState === "delhi") return { amount: 0, supported: true };

  if (normalizedState === "maharashtra") {
    if (monthlyGross <= 7500) return { amount: 0, supported: true };
    if (monthlyGross <= 10000) return { amount: 175, supported: true };
    return { amount: isFebruary(payrollMonth) ? 300 : 200, supported: true };
  }

  if (normalizedState === "karnataka") {
    return { amount: monthlyGross >= 25000 ? (isFebruary(payrollMonth) ? 300 : 200) : 0, supported: true };
  }

  if (normalizedState === "tamil nadu") {
    const halfYearGross = monthlyGross * 6;
    if (halfYearGross <= 21000) return { amount: 0, supported: true };
    if (halfYearGross <= 30000) return { amount: round(180 / 6), supported: true };
    if (halfYearGross <= 45000) return { amount: round(425 / 6), supported: true };
    if (halfYearGross <= 60000) return { amount: round(930 / 6), supported: true };
    if (halfYearGross <= 75000) return { amount: round(1025 / 6), supported: true };
    return { amount: round(1250 / 6), supported: true };
  }

  return { amount: undefined, supported: false };
}

export function calculateHraExemption(row: PayrollRow) {
  if (row.taxRegime === "New") return 0;
  const annualSalaryForHra = (row.basicSalary + row.dearnessAllowance) * 12;
  const actualAnnualHra = row.hraReceived * 12;
  const locationLimit = annualSalaryForHra * (row.metroCity ? 0.5 : 0.4);
  const rentMinusTenPercent = Math.max(0, row.annualRentPaid - annualSalaryForHra * 0.1);
  return round(Math.min(actualAnnualHra, locationLimit, rentMinusTenPercent));
}

export function validatePayroll(rows: PayrollRow[], options: ValidationOptions = {}): ComplianceResult {
  const issues: ComplianceIssue[] = [];
  const findings: EmployeeFinding[] = [];

  for (const row of rows) {
    if (!row.employeeId || !row.employeeName || !row.state) {
      pushIssue(issues, row, "Data Quality", "Critical", "Required employee identity or state fields are missing.");
    }

    const pfWage = row.basicSalary + row.dearnessAllowance;
    const expectedEmployeeEpf = round(pfWage * 0.12);
    const expectedEmployerEpf = round(pfWage * 0.0367);
    const expectedEmployerEps = round(Math.min(pfWage * 0.0833, 1250));
    const expectedEmployeeEsi = round(row.grossSalary * 0.0075);
    const expectedEmployerEsi = round(row.grossSalary * 0.0325);
    const professionalTax = expectedProfessionalTax(row.state, row.grossSalary, options.payrollMonth);
    const hraExemption = calculateHraExemption(row);

    findings.push({
      employeeId: row.employeeId,
      employeeName: row.employeeName,
      pfWage,
      expectedEmployeeEpf,
      expectedEmployerEpf,
      expectedEmployerEps,
      expectedEmployeeEsi: row.grossSalary <= 21000 ? expectedEmployeeEsi : 0,
      expectedEmployerEsi: row.grossSalary <= 21000 ? expectedEmployerEsi : 0,
      expectedProfessionalTax: professionalTax.amount,
      hraExemption
    });

    if (pfWage <= 15000 && row.employeeEpf === 0) {
      pushIssue(issues, row, "EPF", "Critical", "PF is mandatory when Basic + DA is Rs. 15,000 or below, but employee EPF is missing.", expectedEmployeeEpf, row.employeeEpf);
    }
    if (!nearlyEqual(row.employeeEpf, expectedEmployeeEpf)) {
      pushIssue(issues, row, "EPF", "Critical", "Employee EPF deduction must be 12% of Basic + DA.", expectedEmployeeEpf, row.employeeEpf);
    }
    if (pfWage > 15000) {
      pushIssue(issues, row, "EPF", "Info", "PF contribution may be voluntary because Basic + DA exceeds Rs. 15,000.");
    }

    if (!nearlyEqual(row.employerEpf, expectedEmployerEpf)) {
      pushIssue(issues, row, "EPF", "Warning", "Employer EPF contribution should be 3.67% of Basic + DA.", expectedEmployerEpf, row.employerEpf);
    }

    if (!nearlyEqual(row.employerEps, expectedEmployerEps)) {
      pushIssue(issues, row, "EPS", "Critical", "Employer EPS contribution should be 8.33% of PF wage, capped at Rs. 1,250.", expectedEmployerEps, row.employerEps);
    }

    if (row.grossSalary <= 21000) {
      if (row.employeeEsi === 0) {
        pushIssue(issues, row, "ESI", "Critical", "Employee is ESI eligible, but ESI deduction is missing.", expectedEmployeeEsi, row.employeeEsi);
      } else if (!nearlyEqual(row.employeeEsi, expectedEmployeeEsi)) {
        pushIssue(issues, row, "ESI", "Warning", "Employee ESI deduction should be 0.75% of gross salary.", expectedEmployeeEsi, row.employeeEsi);
      }
    } else {
      pushIssue(issues, row, "ESI", "Info", "Employee exceeds ESI eligibility threshold.");
    }

    if (!professionalTax.supported) {
      pushIssue(issues, row, "Professional Tax", "Info", "Professional Tax rules unavailable for selected state.");
    } else if (professionalTax.amount !== undefined && !nearlyEqual(row.professionalTax, professionalTax.amount)) {
      pushIssue(issues, row, "Professional Tax", "Warning", "Professional Tax deduction does not match the configured MVP state slab.", professionalTax.amount, row.professionalTax);
    }

    if (row.taxRegime === "New") {
      pushIssue(issues, row, "Tax Regime", "Warning", "HRA exemption benefits are not applicable under the New Tax Regime.", 0, hraExemption);
    } else if (hraExemption > 0) {
      pushIssue(issues, row, "HRA", "Info", `Eligible HRA exemption calculated as Rs. ${hraExemption.toLocaleString("en-IN")}.`, hraExemption);
    }
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
    recommendations: buildRecommendations(issues)
  };
}

function buildRecommendations(issues: ComplianceIssue[]) {
  const recommendations: string[] = [];
  const count = (category: ComplianceIssue["category"], severity?: Severity) =>
    issues.filter((issue) => issue.category === category && (!severity || issue.severity === severity)).length;

  const epfIssues = count("EPF", "Critical");
  const epsIssues = count("EPS", "Critical");
  const esiMissing = issues.filter((issue) => issue.category === "ESI" && issue.message.includes("missing")).length;
  const hraIssues = count("HRA") + count("Tax Regime");
  const ptIssues = count("Professional Tax", "Warning");

  if (epfIssues) recommendations.push(`Update employee EPF contribution for ${epfIssues} detected critical EPF issue${epfIssues > 1 ? "s" : ""}.`);
  if (epsIssues) recommendations.push(`Review employer EPS allocation for ${epsIssues} employee${epsIssues > 1 ? "s" : ""}; EPS is capped at Rs. 1,250.`);
  if (esiMissing) recommendations.push(`${esiMissing} employee${esiMissing > 1 ? "s are" : " is"} eligible for ESI but no deduction was found.`);
  if (ptIssues) recommendations.push(`Recheck Professional Tax slabs for ${ptIssues} employee${ptIssues > 1 ? "s" : ""} in supported MVP states.`);
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
