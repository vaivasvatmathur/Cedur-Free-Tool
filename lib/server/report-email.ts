import { readFile } from "node:fs/promises";
import path from "node:path";
import jsPDF from "jspdf";
import type { ComplianceCategory, ComplianceResult, CompanyInfo } from "@/types/payroll";

const brand = {
  purple: [131, 94, 245] as const,
  slate900: [15, 23, 42] as const,
  slate700: [51, 65, 85] as const,
  slate500: [100, 116, 139] as const,
  slate100: [241, 245, 249] as const,
  border: [226, 232, 240] as const,
  green: [16, 185, 129] as const,
  amber: [245, 158, 11] as const,
  red: [239, 68, 68] as const,
  blue: [59, 130, 246] as const
};

type PdfPayload = {
  result: ComplianceResult;
  companyInfo: CompanyInfo;
  generatedAt?: Date;
};

function setTextColor(doc: jsPDF, color: readonly number[]) {
  doc.setTextColor(color[0], color[1], color[2]);
}

function setFillColor(doc: jsPDF, color: readonly number[]) {
  doc.setFillColor(color[0], color[1], color[2]);
}

function setDrawColor(doc: jsPDF, color: readonly number[]) {
  doc.setDrawColor(color[0], color[1], color[2]);
}

async function getLogoDataUri() {
  try {
    const logoPath = path.join(process.cwd(), "public", "cedur-logo.png");
    const logo = await readFile(logoPath);
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return null;
  }
}

function scoreColor(score: number) {
  if (score < 70) return brand.red;
  if (score < 90) return brand.amber;
  return brand.green;
}

function categoryIssues(result: ComplianceResult, category: ComplianceCategory) {
  return result.issues.filter((issue) => issue.category === category);
}

export async function generatePayrollAssessmentPdf({ result, companyInfo, generatedAt = new Date() }: PdfPayload) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const logoDataUri = await getLogoDataUri();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  let y = 18;

  function ensureSpace(required: number) {
    if (y + required <= pageHeight - 18) return;
    addFooter();
    doc.addPage();
    y = 18;
  }

  function addFooter() {
    setDrawColor(doc, brand.border);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    setTextColor(doc, brand.slate500);
    doc.text("Cedur Payroll Compliance Checker", margin, pageHeight - 8);
    doc.text("Confidential assessment report", pageWidth - margin, pageHeight - 8, { align: "right" });
  }

  function sectionTitle(title: string) {
    ensureSpace(18);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(doc, brand.purple);
    doc.text(title, margin, y);
    y += 4;
    setDrawColor(doc, brand.border);
    doc.line(margin, y, pageWidth - margin, y);
    y += 7;
  }

  function wrappedText(text: string, x: number, maxWidth: number, lineHeight = 5) {
    const lines = doc.splitTextToSize(text, maxWidth);
    doc.text(lines, x, y);
    y += lines.length * lineHeight;
  }

  if (logoDataUri) {
    doc.addImage(logoDataUri, "PNG", margin, y - 2, 27, 12);
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    setTextColor(doc, brand.purple);
    doc.text("Cedur", margin, y + 6);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  setTextColor(doc, brand.slate900);
  doc.text("Payroll Compliance Assessment Report", pageWidth - margin, y + 5, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, brand.slate500);
  doc.text(`Generated ${generatedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, pageWidth - margin, y + 11, { align: "right" });
  y += 24;

  setFillColor(doc, brand.slate100);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  setTextColor(doc, scoreColor(result.score));
  doc.text(`${result.score}`, margin + 8, y + 19);
  doc.setFontSize(10);
  doc.text("/ 100", margin + 26, y + 19);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  setTextColor(doc, brand.slate900);
  doc.text(companyInfo.companyName || "Payroll Compliance Assessment", margin + 54, y + 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  setTextColor(doc, brand.slate700);
  doc.text(`${companyInfo.payrollMonth} ${companyInfo.financialYear} | ${companyInfo.state}`, margin + 54, y + 17);
  doc.text(`${result.totalEmployees} employees checked | ${result.criticalCount} critical | ${result.warningCount} warnings | ${result.infoCount} info`, margin + 54, y + 24);
  y += 42;

  sectionTitle("Key Observations");
  const observations = [
    `Overall payroll health score is ${result.score}/100 across ${result.totalEmployees} employee record${result.totalEmployees === 1 ? "" : "s"}.`,
    `${result.compliantEmployees} employee${result.compliantEmployees === 1 ? "" : "s"} currently have no critical or warning findings.`,
    result.criticalCount
      ? `${result.criticalCount} critical finding${result.criticalCount === 1 ? "" : "s"} should be resolved before payroll closure.`
      : "No critical statutory violations were detected in the current assessment.",
    result.warningCount
      ? `${result.warningCount} warning finding${result.warningCount === 1 ? "" : "s"} should be reviewed by payroll or finance.`
      : "No warning-level payroll exceptions were detected."
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setTextColor(doc, brand.slate700);
  observations.forEach((observation) => {
    ensureSpace(8);
    doc.text("-", margin, y);
    wrappedText(observation, margin + 5, pageWidth - margin * 2 - 5);
    y += 1;
  });

  const findingSections: Array<[string, ComplianceCategory]> = [
    ["EPF Findings", "EPF"],
    ["EPS Findings", "EPS"],
    ["ESI Findings", "ESI"],
    ["Professional Tax Findings", "Professional Tax"],
    ["HRA Findings", "HRA"],
    ["Tax Regime Findings", "Tax Regime"]
  ];

  findingSections.forEach(([title, category]) => {
    sectionTitle(title);
    const issues = categoryIssues(result, category);
    if (!issues.length) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9.5);
      setTextColor(doc, brand.slate500);
      doc.text("No findings for this category.", margin, y);
      y += 8;
      return;
    }

    issues.slice(0, 12).forEach((issue) => {
      ensureSpace(14);
      const color = issue.severity === "Critical" ? brand.red : issue.severity === "Warning" ? brand.amber : brand.blue;
      setFillColor(doc, color);
      doc.circle(margin + 1.5, y - 1.5, 1.4, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      setTextColor(doc, color);
      doc.text(issue.severity, margin + 6, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.7);
      setTextColor(doc, brand.slate700);
      wrappedText(`${issue.employeeName} (${issue.employeeId}): ${issue.message}`, margin + 27, pageWidth - margin * 2 - 27, 4.2);
      y += 2;
    });

    if (issues.length > 12) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      setTextColor(doc, brand.slate500);
      doc.text(`+ ${issues.length - 12} additional finding${issues.length - 12 === 1 ? "" : "s"} available in the dashboard.`, margin, y);
      y += 7;
    }
  });

  sectionTitle("Employee Summary");
  setFillColor(doc, brand.slate100);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  setTextColor(doc, brand.slate900);
  doc.text("Employee", margin + 2, y);
  doc.text("Status", margin + 58, y);
  doc.text("Severity", margin + 88, y);
  doc.text("Primary Finding", margin + 118, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  result.employeeLogs.slice(0, 18).forEach((log) => {
    ensureSpace(10);
    doc.text(`${log.employeeName}`.slice(0, 28), margin + 2, y);
    doc.text(log.status, margin + 58, y);
    doc.text(log.severity, margin + 88, y);
    wrappedText(log.issue, margin + 118, pageWidth - margin * 2 - 118, 4);
    y += 1.5;
  });

  if (result.employeeLogs.length > 18) {
    ensureSpace(8);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    setTextColor(doc, brand.slate500);
    doc.text(`+ ${result.employeeLogs.length - 18} additional employee row${result.employeeLogs.length - 18 === 1 ? "" : "s"} omitted from this email summary.`, margin, y);
    y += 7;
  }

  sectionTitle("Recommendations");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  setTextColor(doc, brand.slate700);
  result.recommendations.forEach((recommendation, index) => {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.text(`${index + 1}.`, margin, y);
    doc.setFont("helvetica", "normal");
    wrappedText(recommendation, margin + 7, pageWidth - margin * 2 - 7);
    y += 1;
  });

  addFooter();
  return Buffer.from(doc.output("arraybuffer"));
}

export function buildReportEmailHtml(result: ComplianceResult, companyInfo: CompanyInfo) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a;line-height:1.55">
      <h1 style="margin:0 0 8px;color:#835ef5">Your Cedur Payroll Compliance Report is ready</h1>
      <p style="margin:0 0 16px">Attached is the PDF assessment for ${companyInfo.companyName || "your payroll data"}.</p>
      <div style="border:1px solid #e2e8f0;border-radius:12px;padding:16px;background:#f8fafc;margin:18px 0">
        <strong style="font-size:28px;color:#0f172a">${result.score}/100</strong>
        <p style="margin:6px 0 0;color:#475569">${result.totalEmployees} employees checked | ${result.criticalCount} critical | ${result.warningCount} warnings</p>
      </div>
      <p style="margin:0 0 12px">Review the attachment for EPF, EPS, ESI, Professional Tax, HRA, tax-regime findings, employee summary, and recommendations.</p>
      <p style="margin:24px 0 0;color:#64748b;font-size:12px">Cedur Payroll Compliance Checker</p>
    </div>
  `;
}
