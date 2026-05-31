"use client";

import jsPDF from "jspdf";
import type { ComplianceCategory, ComplianceResult } from "@/types/payroll";

const categories: ComplianceCategory[] = ["EPF", "EPS", "ESI", "Professional Tax", "HRA", "Tax Regime"];

export function generateCompliancePdf(result: ComplianceResult) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  doc.setFillColor(131, 94, 245);
  doc.roundedRect(14, 12, pageWidth - 28, 24, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Cedur Payroll Intelligence Suite", 22, 27);
  doc.setFontSize(10);
  doc.text("Payroll Compliance Validation Report", pageWidth - 83, 27);

  y = 52;
  doc.setTextColor(32, 28, 47);
  doc.setFontSize(24);
  doc.text(`${result.score}/100`, 16, y);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Payroll Health Score", 16, y + 8);

  doc.setFont("helvetica", "bold");
  doc.text(`Employees checked: ${result.totalEmployees}`, 16, y + 24);
  doc.text(`Critical: ${result.criticalCount}`, 82, y + 24);
  doc.text(`Warnings: ${result.warningCount}`, 124, y + 24);
  doc.text(`Info: ${result.infoCount}`, 166, y + 24);

  y += 44;
  categories.forEach((category) => {
    const categoryIssues = result.issues.filter((issue) => issue.category === category);
    if (!categoryIssues.length) return;
    if (y > 250) {
      doc.addPage();
      y = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(`${category} Findings`, 16, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    categoryIssues.slice(0, 8).forEach((issue) => {
      doc.text(`${issue.severity} | ${issue.employeeName}: ${issue.message}`, 16, y, { maxWidth: pageWidth - 32 });
      y += 8;
    });
    y += 3;
  });

  if (y > 235) {
    doc.addPage();
    y = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Recommendations", 16, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  result.recommendations.forEach((recommendation, index) => {
    doc.text(`${index + 1}. ${recommendation}`, 16, y, { maxWidth: pageWidth - 32 });
    y += 10;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Employee Summary", 16, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  result.employeeLogs.forEach((log) => {
    if (y > 280) {
      doc.addPage();
      y = 20;
    }
    doc.text(`${log.employeeId}  ${log.employeeName}  ${log.status}  ${log.severity}  ${log.issue}`, 16, y, { maxWidth: pageWidth - 32 });
    y += 9;
  });

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
