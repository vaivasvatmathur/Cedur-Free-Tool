"use client";

import type { ComplianceResult, CompanyInfo } from "@/types/payroll";
import { renderCompliancePdf } from "@/lib/compliance-pdf";

async function loadLogoDataUri() {
  try {
    const response = await fetch("/cedur-logo.png");
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return `data:image/png;base64,${btoa(binary)}`;
  } catch {
    return null;
  }
}

export async function generateCompliancePdf(result: ComplianceResult, companyInfo?: CompanyInfo) {
  const logoDataUri = await loadLogoDataUri();
  const doc = renderCompliancePdf({ result, companyInfo, logoDataUri });
  doc.save("cedur-payroll-compliance-report.pdf");
}

export function downloadComplianceCsv(result: ComplianceResult) {
  const headers = ["Employee ID", "Employee Name", "Department", "Issue", "Severity", "Status", "Gross Salary"];
  const rows = result.employeeLogs.map((log) => [
    log.employeeId,
    log.employeeName,
    log.department,
    log.issue,
    log.severity,
    log.status,
    String(log.grossSalary)
  ]);
  const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "cedur-payroll-compliance-report.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
