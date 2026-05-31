import type { CompanyInfo, PayrollRow } from "@/types/payroll";

export const sampleCompanyInfo: CompanyInfo = {
  companyName: "Cedur Demo Pvt Ltd",
  state: "Maharashtra",
  payrollMonth: "May",
  financialYear: "2026-27"
};

export const samplePayrollRows: PayrollRow[] = [
  {
    employeeId: "CED-1001",
    employeeName: "Ananya Rao",
    department: "Operations",
    state: "Maharashtra",
    basicSalary: 28000,
    dearnessAllowance: 2000,
    grossSalary: 52000,
    hraReceived: 12000,
    annualRentPaid: 240000,
    metroCity: true,
    employeeEpf: 3600,
    employerEpf: 1101,
    employerEps: 1250,
    employeeEsi: 0,
    professionalTax: 200,
    taxRegime: "Old"
  },
  {
    employeeId: "CED-1002",
    employeeName: "Karan Mehta",
    department: "Finance",
    state: "Karnataka",
    basicSalary: 12000,
    dearnessAllowance: 1000,
    grossSalary: 30000,
    hraReceived: 8000,
    annualRentPaid: 144000,
    metroCity: false,
    employeeEpf: 1200,
    employerEpf: 477,
    employerEps: 1083,
    employeeEsi: 0,
    professionalTax: 200,
    taxRegime: "New"
  },
  {
    employeeId: "CED-1003",
    employeeName: "Ishita Sen",
    department: "People",
    state: "Tamil Nadu",
    basicSalary: 9500,
    dearnessAllowance: 500,
    grossSalary: 19000,
    hraReceived: 4500,
    annualRentPaid: 96000,
    metroCity: true,
    employeeEpf: 1200,
    employerEpf: 367,
    employerEps: 833,
    employeeEsi: 120,
    professionalTax: 0,
    taxRegime: "Old"
  },
  {
    employeeId: "CED-1004",
    employeeName: "Rohit Nair",
    department: "Sales",
    state: "Delhi",
    basicSalary: 23000,
    dearnessAllowance: 0,
    grossSalary: 35000,
    hraReceived: 9000,
    annualRentPaid: 180000,
    metroCity: true,
    employeeEpf: 2760,
    employerEpf: 844,
    employerEps: 1250,
    employeeEsi: 0,
    professionalTax: 0,
    taxRegime: "Old"
  },
  {
    employeeId: "CED-1005",
    employeeName: "Meera Iyer",
    department: "Engineering",
    state: "Maharashtra",
    basicSalary: 46000,
    dearnessAllowance: 0,
    grossSalary: 78000,
    hraReceived: 22000,
    annualRentPaid: 300000,
    metroCity: true,
    employeeEpf: 5520,
    employerEpf: 1600,
    employerEps: 1000,
    employeeEsi: 0,
    professionalTax: 200,
    taxRegime: "New"
  },
  {
    employeeId: "CED-1006",
    employeeName: "Dev Malhotra",
    department: "Support",
    state: "Gujarat",
    basicSalary: 8200,
    dearnessAllowance: 800,
    grossSalary: 20000,
    hraReceived: 4200,
    annualRentPaid: 84000,
    metroCity: false,
    employeeEpf: 0,
    employerEpf: 0,
    employerEps: 0,
    employeeEsi: 150,
    professionalTax: 0,
    taxRegime: "Old"
  }
];

export const monthlyCompliance = [
  { month: "Jan", compliant: 82, warnings: 12, critical: 6 },
  { month: "Feb", compliant: 84, warnings: 10, critical: 6 },
  { month: "Mar", compliant: 88, warnings: 8, critical: 4 },
  { month: "Apr", compliant: 86, warnings: 9, critical: 5 },
  { month: "May", compliant: 91, warnings: 6, critical: 3 },
  { month: "Jun", compliant: 93, warnings: 5, critical: 2 }
];
