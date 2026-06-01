"use client";

import jsPDF from "jspdf";
import type { ComplianceResult, CompanyInfo } from "@/types/payroll";

export function generateCompliancePdf(result: ComplianceResult, companyInfo?: CompanyInfo) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 20;

  // Primary Theme Palette (Premium Slate & Deep Indigo)
  const primaryColor = [131, 94, 245]; // #835ef5 (deep indigo)
  const darkTextColor = [30, 41, 59]; // slate-800
  const lightTextColor = [100, 116, 139]; // slate-500
  const borderLight = [226, 232, 240]; // slate-200
  const backgroundSlate = [248, 250, 252]; // slate-50

  // Helper function to draw header band on each page if needed
  function drawHeaderBanner(firstPage: boolean = false) {
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.roundedRect(14, 12, pageWidth - 28, 26, 4, 4, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("CEDUR PAYROLL COMPLIANCE CHECKER", 22, 28);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("STATUTORY COMPLIANCE AUDIT", pageWidth - 22, 28, { align: "right" });
  }

  // Draw Page 1 Header
  drawHeaderBanner(true);
  y = 48;

  // Section 1: Company Information
  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("1. Company Information", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  
  const compName = companyInfo?.companyName || "N/A";
  const state = companyInfo?.state || "N/A";
  const month = companyInfo?.payrollMonth || "N/A";
  const fy = companyInfo?.financialYear || "N/A";

  doc.text(`Company Name: ${compName}`, 14, y);
  doc.text(`State / Region: ${state}`, 110, y);
  y += 6;
  doc.text(`Payroll Period: ${month}`, 14, y);
  doc.text(`Financial Year: ${fy}`, 110, y);
  y += 8;

  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Section 2: Payroll Health Score
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("2. Payroll Health Score", 14, y);
  y += 6;

  // Health Score Callout Box
  doc.setFillColor(backgroundSlate[0], backgroundSlate[1], backgroundSlate[2]);
  doc.roundedRect(14, y, pageWidth - 28, 22, 2, 2, "F");
  
  // Custom Color based on Score (Green/Amber/Red)
  let scoreColor = [16, 185, 129]; // green-500 (excellent)
  if (result.score < 70) {
    scoreColor = [239, 68, 68]; // red-500 (action required)
  } else if (result.score < 90) {
    scoreColor = [245, 158, 11]; // amber-500 (review recommended)
  }
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(scoreColor[0], scoreColor[1], scoreColor[2]);
  doc.text(`${result.score} / 100`, 22, y + 14);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  
  doc.text(`Total Employees Audited: ${result.totalEmployees}`, 75, y + 8);
  doc.text(`Critical Violations: ${result.criticalCount}`, 75, y + 15);
  doc.text(`Warning Alerts: ${result.warningCount}`, 135, y + 8);
  doc.text(`Informational Notes: ${result.infoCount}`, 135, y + 15);
  
  y += 32;

  // Function to render standard findings sections
  function renderFindingsSection(title: string, categoryKey: string) {
    const issues = result.issues.filter((issue) => issue.category === categoryKey);
    
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text(title, 14, y);
    y += 5;

    doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
    doc.line(14, y, pageWidth - 14, y);
    y += 7;

    if (issues.length === 0) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      doc.setTextColor(lightTextColor[0], lightTextColor[1], lightTextColor[2]);
      doc.text("No statutory non-compliance or exceptions flagged for this category.", 16, y);
      y += 8;
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      
      issues.forEach((issue) => {
        if (y > pageHeight - 20) {
          doc.addPage();
          y = 20;
        }

        let severityLabelColor = [100, 116, 139]; // Default Gray
        if (issue.severity === "Critical") severityLabelColor = [239, 68, 68];
        else if (issue.severity === "Warning") severityLabelColor = [245, 158, 11];
        else if (issue.severity === "Info") severityLabelColor = [59, 130, 246];

        // Draw a tiny status indicator bullet
        doc.setFillColor(severityLabelColor[0], severityLabelColor[1], severityLabelColor[2]);
        doc.circle(18, y - 2, 1.2, "F");

        doc.setFont("helvetica", "bold");
        doc.setTextColor(severityLabelColor[0], severityLabelColor[1], severityLabelColor[2]);
        doc.text(`[${issue.severity.toUpperCase()}]`, 22, y);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
        
        const textPayload = `${issue.employeeName} (${issue.employeeId}): ${issue.message}`;
        doc.text(textPayload, 48, y, { maxWidth: pageWidth - 58 });
        
        // Multi-line spacing offset
        const lines = doc.splitTextToSize(textPayload, pageWidth - 58).length;
        y += 5 * lines + 3;
      });
      y += 1;
    }
  }

  // Section 3: EPF Findings
  renderFindingsSection("3. EPF Findings", "EPF");

  // Section 4: EPS Findings
  renderFindingsSection("4. EPS Findings", "EPS");

  // Section 5: ESI Findings
  renderFindingsSection("5. ESI Findings", "ESI");

  // Section 6: PT Findings
  renderFindingsSection("6. PT Findings", "Professional Tax");

  // Section 7: HRA Findings
  renderFindingsSection("7. HRA Findings", "HRA");

  // Section 8: Tax Regime Findings
  renderFindingsSection("8. Tax Regime Findings", "Tax Regime");

  // Section 9: Recommendations
  if (y > pageHeight - 40) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("9. Actionable Recommendations", 14, y);
  y += 5;

  doc.setDrawColor(borderLight[0], borderLight[1], borderLight[2]);
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);

  result.recommendations.forEach((rec, idx) => {
    if (y > pageHeight - 20) {
      doc.addPage();
      y = 20;
    }
    const recText = `${idx + 1}. ${rec}`;
    doc.text(recText, 16, y, { maxWidth: pageWidth - 32 });
    const recLines = doc.splitTextToSize(recText, pageWidth - 32).length;
    y += 5 * recLines + 3;
  });

  // Section 10: Employee-Level Findings (Table format)
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 20;
  }

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("10. Employee-Level Findings", 14, y);
  y += 5;
  doc.line(14, y, pageWidth - 14, y);
  y += 8;

  // Table Header Layout
  doc.setFillColor(241, 245, 249); // slate-100 table header
  doc.rect(14, y - 5, pageWidth - 28, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.text("Emp ID", 16, y);
  doc.text("Name", 38, y);
  doc.text("Status", 80, y);
  doc.text("Severity", 105, y);
  doc.text("Primary Issue / Compliance Log Summary", 130, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  result.employeeLogs.forEach((log) => {
    if (y > pageHeight - 15) {
      doc.addPage();
      y = 20;

      // Repeat Table Header on overflow
      doc.setFillColor(241, 245, 249);
      doc.rect(14, y - 5, pageWidth - 28, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.text("Emp ID", 16, y);
      doc.text("Name", 38, y);
      doc.text("Status", 80, y);
      doc.text("Severity", 105, y);
      doc.text("Primary Issue / Compliance Log Summary", 130, y);
      y += 8;
      doc.setFont("helvetica", "normal");
    }

    let statusColor = [16, 185, 129]; // green
    if (log.status === "Non-Compliant") {
      statusColor = [239, 68, 68]; // red
    } else if (log.status === "Review") {
      statusColor = [245, 158, 11]; // orange
    }

    doc.text(log.employeeId, 16, y);
    doc.text(log.employeeName.substring(0, 22), 38, y);

    doc.setFont("helvetica", "bold");
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(log.status, 80, y);

    let sevColor = [100, 116, 139];
    if (log.severity === "Critical") {
      sevColor = [239, 68, 68];
    } else if (log.severity === "Warning") {
      sevColor = [245, 158, 11];
    } else if (log.severity === "Info") {
      sevColor = [59, 130, 246];
    }

    doc.setTextColor(sevColor[0], sevColor[1], sevColor[2]);
    doc.text(log.severity, 105, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
    
    const logIssue = log.issue || "No issues detected";
    doc.text(logIssue, 130, y, { maxWidth: pageWidth - 146 });

    const issueLines = doc.splitTextToSize(logIssue, pageWidth - 146).length;
    y += 4 * issueLines + 4;
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
