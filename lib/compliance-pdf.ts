import jsPDF from "jspdf";
import type { ComplianceCategory, ComplianceIssue, ComplianceResult, CompanyInfo, Severity } from "@/types/payroll";

const brand = {
  purple: [131, 94, 245] as const,
  slate900: [15, 23, 42] as const,
  slate700: [51, 65, 85] as const,
  slate500: [100, 116, 139] as const,
  slate100: [241, 245, 249] as const,
  slate50: [248, 250, 252] as const,
  border: [226, 232, 240] as const,
  green: [16, 185, 129] as const,
  amber: [245, 158, 11] as const,
  red: [239, 68, 68] as const,
  blue: [59, 130, 246] as const
};

const FINDING_SECTIONS: Array<{ title: string; category: ComplianceCategory; checkType?: string }> = [
  { title: "EPF Findings - Employee EPF Compliance", category: "EPF", checkType: "Employee EPF" },
  { title: "EPF Findings - Employer EPF Compliance", category: "EPF", checkType: "Employer EPF" },
  { title: "EPS Findings - Employer EPS Compliance", category: "EPS", checkType: "Employer EPS" },
  { title: "ESI Findings", category: "ESI" },
  { title: "PT Findings", category: "Professional Tax" },
  { title: "HRA Findings", category: "HRA" },
  { title: "Tax Regime Findings", category: "Tax Regime" }
];

export type RenderCompliancePdfOptions = {
  result: ComplianceResult;
  companyInfo?: CompanyInfo;
  generatedAt?: Date;
  logoDataUri?: string | null;
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

function severityColor(severity: Severity) {
  if (severity === "Critical") return brand.red;
  if (severity === "Warning") return brand.amber;
  return brand.blue;
}

function scoreColor(score: number) {
  if (score >= 90) return brand.green;
  if (score >= 75) return brand.blue;
  if (score >= 50) return brand.amber;
  return brand.red;
}

function riskLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Needs Review";
  return "High Risk";
}

function formatGeneratedDate(date: Date) {
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getMostCommonIssues(issues: ComplianceIssue[], limit = 5) {
  const counts = new Map<string, number>();
  issues.forEach((issue) => {
    counts.set(issue.message, (counts.get(issue.message) ?? 0) + 1);
  });
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([message]) => message);
}

function categoryIssues(result: ComplianceResult, category: ComplianceCategory) {
  return result.issues.filter((issue) => issue.category === category && issue.severity !== "Info");
}

export function renderCompliancePdf({
  result,
  companyInfo,
  generatedAt = new Date(),
  logoDataUri = null
}: RenderCompliancePdfOptions) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  const footerTop = pageHeight - 18;
  const contentBottom = footerTop - 4;
  let y = margin;

  function drawLogo(x: number, top: number, width: number) {
    const height = width * (56 / 164);
    if (logoDataUri) {
      doc.addImage(logoDataUri, "PNG", x, top, width, height);
      return height;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    setTextColor(doc, brand.purple);
    doc.text("Cedur", x, top + height * 0.72);
    return height;
  }

  function drawPageHeader(full = false) {
    const logoWidth = full ? 34 : 24;
    const logoHeight = drawLogo(margin, y, logoWidth);

    if (full) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      setTextColor(doc, brand.slate900);
      doc.text("Payroll Compliance Audit Report", margin, y + logoHeight + 7);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setTextColor(doc, brand.slate700);
      doc.text(`Payroll Period: ${companyInfo?.payrollMonth ?? "N/A"}`, margin, y + logoHeight + 13);
      doc.text(`Generated: ${formatGeneratedDate(generatedAt)}`, margin, y + logoHeight + 18);

      y += logoHeight + 22;
      setDrawColor(doc, brand.purple);
      doc.setLineWidth(0.6);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
      return;
    }

    y += logoHeight + 6;
    setDrawColor(doc, brand.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  function addFooterPlaceholders() {
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      setDrawColor(doc, brand.border);
      doc.setLineWidth(0.3);
      doc.line(margin, footerTop, pageWidth - margin, footerTop);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      setTextColor(doc, brand.slate500);
      doc.text("Generated by Cedur Payroll Compliance Checker", margin, pageHeight - 10);
      doc.text("Confidential Report", pageWidth / 2, pageHeight - 10, { align: "center" });
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: "right" });
    }
  }

  function startNewPage() {
    doc.addPage();
    y = margin;
    drawPageHeader(false);
  }

  function ensureSpace(required: number) {
    if (y + required <= contentBottom) return;
    startNewPage();
  }

  function sectionHeading(title: string) {
    ensureSpace(16);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    setTextColor(doc, brand.slate900);
    doc.text(title, margin, y);
    y += 5;
    setDrawColor(doc, brand.border);
    doc.setLineWidth(0.3);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  function drawSeverityBadge(x: number, baseline: number, severity: Severity) {
    const label = severity === "Info" ? "Observation" : severity;
    let color: readonly number[] = severityColor(severity);
    if (severity === "Info") {
      color = [71, 85, 105]; // soft neutral blue/gray (slate-600)
    }
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const badgeWidth = doc.getTextWidth(label) + 6;
    const badgeHeight = 5;
    const badgeY = baseline - 3.6;

    setFillColor(doc, [
      Math.min(255, Math.round(color[0] + (255 - color[0]) * 0.85)),
      Math.min(255, Math.round(color[1] + (255 - color[1]) * 0.85)),
      Math.min(255, Math.round(color[2] + (255 - color[2]) * 0.85))
    ]);
    doc.roundedRect(x, badgeY, badgeWidth, badgeHeight, 1, 1, "F");
    setTextColor(doc, color);
    doc.text(label, x + 3, baseline);
    return badgeWidth;
  }

  function drawCompanyInformation() {
    sectionHeading("Company Information");

    const cardTop = y;
    const cardHeight = 34;
    setFillColor(doc, brand.slate50);
    setDrawColor(doc, brand.border);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, cardTop, contentWidth, cardHeight, 2, 2, "FD");

    const labelX = margin + 5;
    const valueX = margin + 52;
    const rows: Array<[string, string]> = [
      ["Company Name", companyInfo?.companyName ?? "N/A"],
      ["State", companyInfo?.state ?? "N/A"],
      ["Payroll Period", companyInfo?.payrollMonth ?? "N/A"],
      ["Financial Year", companyInfo?.financialYear ?? "N/A"],
      ["Employees Audited", String(result.totalEmployees)]
    ];

    let rowY = cardTop + 8;
    rows.forEach(([label, value]) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setTextColor(doc, brand.slate500);
      doc.text(label, labelX, rowY);
      doc.setFont("helvetica", "bold");
      setTextColor(doc, brand.slate900);
      doc.text(value, valueX, rowY);
      rowY += 5.2;
    });

    y = cardTop + cardHeight + 8;
  }

  function drawHealthScore() {
    sectionHeading("Payroll Health Score");

    const cardTop = y;
    const cardHeight = 38;
    setFillColor(doc, brand.slate50);
    setDrawColor(doc, brand.border);
    doc.roundedRect(margin, cardTop, contentWidth, cardHeight, 2, 2, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, brand.slate500);
    doc.text("Payroll Health Score", margin + 5, cardTop + 8);

    const scoreTint = scoreColor(result.score);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    setTextColor(doc, scoreTint);
    doc.text(`${result.score} / 100`, margin + 5, cardTop + 18);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    setTextColor(doc, scoreTint);
    doc.text(riskLabel(result.score), margin + 5, cardTop + 25);

    const stats: Array<{ label: string; value: string; color: readonly number[] }> = [
      { label: "Employees Audited", value: String(result.totalEmployees), color: brand.slate700 },
      { label: "Critical Employees", value: String(result.criticalCount), color: brand.red },
      { label: "Employees Requiring Review", value: String(result.warningCount), color: brand.amber },
      { label: "Fully Compliant Employees", value: String(result.compliantEmployees), color: brand.green }
    ];

    let statY = cardTop + 10;
    stats.forEach((stat) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setTextColor(doc, brand.slate500);
      doc.text(stat.label, margin + 72, statY);
      doc.setFont("helvetica", "bold");
      setTextColor(doc, stat.color);
      doc.text(stat.value, margin + 118, statY);
      statY += 5.5;
    });

    y = cardTop + cardHeight + 8;
  }

  type TableColumn = {
    header: string;
    width: number;
    align?: "left" | "right";
  };

  function drawTableHeader(columns: TableColumn[], xPositions: number[]) {
    const headerHeight = 7;
    setFillColor(doc, brand.slate100);
    doc.rect(margin, y - 4.5, contentWidth, headerHeight, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setTextColor(doc, brand.slate900);
    columns.forEach((column, index) => {
      const x = xPositions[index];
      if (column.align === "right") {
        doc.text(column.header, x + column.width, y, { align: "right" });
      } else {
        doc.text(column.header, x, y);
      }
    });
    y += headerHeight + 1;
  }

  function drawFindingsTable(title: string, issues: ComplianceIssue[]) {
    let tableTitle = title;

    const beginTable = () => {
      sectionHeading(tableTitle);
    };

    beginTable();

    if (title.toLowerCase().includes("pt") || title.toLowerCase().includes("professional tax")) {
      const disclaimerLines = doc.splitTextToSize(
        "Professional Tax rules vary by state and may change periodically. Results are based on configured state rules.",
        contentWidth
      );
      const disclaimerHeight = disclaimerLines.length * 4.2;
      ensureSpace(disclaimerHeight);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7.5);
      setTextColor(doc, brand.slate500);
      doc.text(disclaimerLines, margin, y);
      y += disclaimerHeight + 2;
    }

    if (!issues.length) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setTextColor(doc, brand.green);
      doc.text("✓ No issues detected", margin, y);
      y += 8;
      return;
    }

    const columns: TableColumn[] = [
      { header: "Severity", width: 22 },
      { header: "Employee", width: 34 },
      { header: "Employee ID", width: 22 },
      { header: "Observation", width: contentWidth - 78 }
    ];
    const xPositions = [margin + 1, margin + 24, margin + 60, margin + 84];
    const headerHeight = 8;

    const drawHeader = () => {
      ensureSpace(headerHeight + 6);
      drawTableHeader(columns, xPositions);
    };

    drawHeader();

    issues.forEach((issue, index) => {
      let displayMessage = issue.message;
      if (displayMessage === "Contribution follows statutory PF wage ceiling.") {
        displayMessage = "Contribution follows statutory PF wage ceiling method and is compliant.";
      }
      const observationLines = doc.splitTextToSize(displayMessage, columns[3].width - 2);
      const rowHeight = Math.max(7, observationLines.length * 4.2 + 2);

      if (y + rowHeight > contentBottom) {
        startNewPage();
        tableTitle = `${title} (continued)`;
        beginTable();
        drawHeader();
      }

      if (index % 2 === 0) {
        setFillColor(doc, [252, 252, 253]);
        doc.rect(margin, y - 3.5, contentWidth, rowHeight, "F");
      }

      const baseline = y + 1.5;
      drawSeverityBadge(xPositions[0], baseline, issue.severity);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      setTextColor(doc, brand.slate900);
      doc.text(issue.employeeName, xPositions[1], baseline);
      setTextColor(doc, brand.slate700);
      doc.text(issue.employeeId, xPositions[2], baseline);
      setTextColor(doc, brand.slate700);
      doc.text(observationLines, xPositions[3], baseline);

      y += rowHeight;
    });

    y += 4;
  }

  function drawRecommendations() {
    if (!result.recommendations.length) return;

    sectionHeading("Actionable Recommendations");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setTextColor(doc, brand.slate700);

    result.recommendations.forEach((recommendation, index) => {
      const lines = doc.splitTextToSize(recommendation, contentWidth - 6);
      const blockHeight = lines.length * 4.5 + 2;
      ensureSpace(blockHeight);
      doc.setFont("helvetica", "bold");
      setTextColor(doc, brand.purple);
      doc.text(`${index + 1}.`, margin, y);
      doc.setFont("helvetica", "normal");
      setTextColor(doc, brand.slate700);
      doc.text(lines, margin + 6, y);
      y += blockHeight;
    });

    y += 2;
  }

  function drawExecutiveSummary() {
    sectionHeading("Executive Summary");

    const commonIssues = getMostCommonIssues(result.issues, 5);
    let commonIssuesHeight = 5;
    if (!commonIssues.length) {
      commonIssuesHeight = 5;
    } else {
      commonIssues.forEach((issue) => {
        const lines = doc.splitTextToSize(`• ${issue}`, contentWidth - 12);
        commonIssuesHeight += lines.length * 4.2;
      });
    }

    const summaryHeight = 44 + commonIssuesHeight;
    ensureSpace(summaryHeight);

    const summaryTop = y;

    setFillColor(doc, brand.slate50);
    setDrawColor(doc, brand.border);
    doc.roundedRect(margin, summaryTop, contentWidth, summaryHeight, 2, 2, "FD");

    let lineY = summaryTop + 8;
    const writeLine = (label: string, value: string, valueColor: readonly number[] = brand.slate900) => {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setTextColor(doc, brand.slate500);
      doc.text(label, margin + 5, lineY);
      doc.setFont("helvetica", "bold");
      setTextColor(doc, valueColor);
      doc.text(value, margin + 62, lineY);
      lineY += 5.5;
    };

    writeLine("Total Employees Audited:", String(result.totalEmployees));
    writeLine("Critical Employees:", String(result.criticalCount), brand.red);
    writeLine("Employees Requiring Review:", String(result.warningCount), brand.amber);
    writeLine("Fully Compliant Employees:", String(result.compliantEmployees), brand.green);

    lineY += 1;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setTextColor(doc, brand.slate900);
    doc.text("Most Common Issues:", margin + 5, lineY);
    lineY += 5;

    if (!commonIssues.length) {
      doc.setFont("helvetica", "normal");
      setTextColor(doc, brand.green);
      doc.text("• No recurring issues identified", margin + 8, lineY);
      lineY += 5;
    } else {
      doc.setFont("helvetica", "normal");
      setTextColor(doc, brand.slate700);
      commonIssues.forEach((issue) => {
        const lines = doc.splitTextToSize(`• ${issue}`, contentWidth - 12);
        doc.text(lines, margin + 8, lineY);
        lineY += lines.length * 4.2;
      });
    }

    lineY += 1;
    doc.setFont("helvetica", "normal");
    setTextColor(doc, brand.slate500);
    doc.text("Overall Compliance Score:", margin + 5, lineY);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setTextColor(doc, scoreColor(result.score));
    doc.text(`${result.score} / 100`, margin + 62, lineY);

    y = summaryTop + summaryHeight + 6;
  }

  drawPageHeader(true);
  drawCompanyInformation();
  drawHealthScore();

  FINDING_SECTIONS.forEach(({ title, category, checkType }) => {
    let issues = categoryIssues(result, category);
    if (checkType) {
      issues = issues.filter((issue) => issue.checkType === checkType);
    }
    drawFindingsTable(title, issues);
  });

  drawRecommendations();
  drawExecutiveSummary();
  addFooterPlaceholders();

  return doc;
}
