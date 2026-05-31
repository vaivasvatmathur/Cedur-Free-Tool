export type Severity = "Critical" | "Warning" | "Info";

export type TaxRegime = "Old" | "New";

export type SupportedState = "Maharashtra" | "Karnataka" | "Tamil Nadu" | "Delhi" | string;

export type CompanyInfo = {
  companyName: string;
  state: SupportedState;
  payrollMonth: string;
  financialYear: string;
};

export type PayrollRow = {
  employeeId: string;
  employeeName: string;
  department: string;
  state: SupportedState;
  basicSalary: number;
  dearnessAllowance: number;
  grossSalary: number;
  hraReceived: number;
  annualRentPaid: number;
  metroCity: boolean;
  employeeEpf: number;
  employerEpf: number;
  employerEps: number;
  employeeEsi: number;
  professionalTax: number;
  taxRegime: TaxRegime;
};

export type ComplianceCategory = "EPF" | "EPS" | "ESI" | "Professional Tax" | "HRA" | "Tax Regime" | "Data Quality";

export type ComplianceIssue = {
  employeeId: string;
  employeeName: string;
  category: ComplianceCategory;
  severity: Severity;
  message: string;
  expected?: number;
  actual?: number;
};

export type EmployeeComplianceLog = {
  employeeId: string;
  employeeName: string;
  department: string;
  issue: string;
  status: "Compliant" | "Review" | "Non-Compliant";
  issueCount: number;
  severity: Severity | "Clear";
  grossSalary: number;
};

export type EmployeeFinding = {
  employeeId: string;
  employeeName: string;
  pfWage: number;
  expectedEmployeeEpf: number;
  expectedEmployerEpf: number;
  expectedEmployerEps: number;
  expectedEmployeeEsi: number;
  expectedEmployerEsi: number;
  expectedProfessionalTax?: number;
  hraExemption: number;
};

export type ComplianceResult = {
  score: number;
  totalEmployees: number;
  compliantEmployees: number;
  issueCount: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  issues: ComplianceIssue[];
  employeeLogs: EmployeeComplianceLog[];
  findings: EmployeeFinding[];
  recommendations: string[];
};

export type UploadMetadata = {
  fileName: string;
  fileType: string;
  fileSize: number;
  storagePath?: string;
};
