import { readFile } from "node:fs/promises";
import path from "node:path";
import type { ComplianceResult, CompanyInfo } from "@/types/payroll";
import { renderCompliancePdf } from "@/lib/compliance-pdf";

type PdfPayload = {
  result: ComplianceResult;
  companyInfo: CompanyInfo;
  generatedAt?: Date;
};

async function getLogoDataUri() {
  try {
    const logoPath = path.join(process.cwd(), "public", "cedur-logo.png");
    const logo = await readFile(logoPath);
    return `data:image/png;base64,${logo.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function generatePayrollAssessmentPdf({ result, companyInfo, generatedAt = new Date() }: PdfPayload) {
  const logoDataUri = await getLogoDataUri();
  const doc = renderCompliancePdf({ result, companyInfo, generatedAt, logoDataUri });
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
      <p style="margin:0 0 12px">Review the attachment for EPF, EPS, ESI, Professional Tax, HRA, tax-regime findings, and executive summary.</p>
      <p style="margin:24px 0 0;color:#64748b;font-size:12px">Cedur Payroll Compliance Checker</p>
    </div>
  `;
}
