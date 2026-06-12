import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";
import { sampleCompanyInfo, samplePayrollRows } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";
import { buildReportEmailHtml, generatePayrollAssessmentPdf } from "@/lib/server/report-email";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";

export const runtime = "nodejs";

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const isReportDebugEnabled = () => process.env.REPORT_EMAIL_DEBUG === "true" || process.env.NODE_ENV !== "production";
const isFullPayloadDebugEnabled = () => process.env.REPORT_EMAIL_DEBUG_FULL === "true";
const resendTimeoutMs = () => Number(process.env.RESEND_SEND_TIMEOUT_MS ?? 55000);

class ReportEmailTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Resend email request timed out after ${timeoutMs}ms`);
    this.name = "ReportEmailTimeoutError";
  }
}

type EmailPayload = {
  from: string;
  to: string;
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  attachments: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  tags: Array<{ name: string; value: string }>;
};

async function sendEmailWithResend(apiKey: string, payload: EmailPayload, timeoutMs: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: payload.from,
        to: payload.to,
        reply_to: payload.replyTo,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
        attachments: payload.attachments.map((attachment) => ({
          filename: attachment.filename,
          content: attachment.content,
          content_type: attachment.contentType
        })),
        tags: payload.tags
      }),
      signal: controller.signal
    });

    const responseBody = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        data: null,
        error: responseBody ?? {
          name: "resend_error",
          message: `Resend returned HTTP ${response.status}`,
          statusCode: response.status
        }
      };
    }

    return { data: responseBody as { id?: string } | null, error: null };
  } finally {
    clearTimeout(timer);
  }
}

const companyInfoSchema = z.object({
  companyName: z.string().optional().default(""),
  state: z.string().optional().default("Maharashtra"),
  payrollMonth: z.string().optional().default("May"),
  financialYear: z.string().optional().default("2026-27")
});

const payrollRowSchema = z.object({
  employeeId: z.string(),
  employeeName: z.string(),
  department: z.string().default("General"),
  state: z.string(),
  basicSalary: z.number(),
  dearnessAllowance: z.number(),
  grossSalary: z.number(),
  hraReceived: z.number(),
  annualRentPaid: z.number(),
  metroCity: z.boolean(),
  employeeEpf: z.number(),
  employerEpf: z.number(),
  employerEps: z.number(),
  employeeEsi: z.number(),
  employerEsi: z.number().optional(),
  professionalTax: z.number(),
  taxRegime: z.enum(["Old", "New"])
});

const sendReportSchema = z.object({
  email: z.preprocess(emptyToUndefined, z.string().email("Enter a valid work email")),
  phone: z.preprocess(emptyToUndefined, z.string().min(10).max(15).optional()),
  sendBoth: z.boolean().optional(),
  companyInfo: companyInfoSchema.optional(),
  rows: z.array(payrollRowSchema).optional()
});

async function logReportDelivery({
  email,
  phone,
  result
}: {
  email: string;
  phone?: string;
  result: ReturnType<typeof validatePayroll>;
}) {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;

  // Logging is useful, but email delivery should not fail if analytics storage is unavailable.
  await Promise.allSettled([
    supabase.from("leads").insert({ email, phone: phone ?? null }),
    supabase.from("reports").insert({
      health_score: result.score,
      critical_issues: result.criticalCount,
      warnings: result.warningCount,
      report_data: result
    })
  ]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = sendReportSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid report request", details: parsed.error.flatten() }, { status: 400 });
    }

    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Report email service is not configured. Add RESEND_API_KEY to the server environment." }, { status: 500 });
    }

    const companyInfo = (parsed.data.companyInfo ?? sampleCompanyInfo) as CompanyInfo;
    const rows = (parsed.data.rows?.length ? parsed.data.rows : samplePayrollRows) as PayrollRow[];

    // Keep report generation server-side so PDF content and email credentials never reach the browser.
    const result = validatePayroll(rows, { payrollMonth: companyInfo.payrollMonth });
    const pdf = await generatePayrollAssessmentPdf({ result, companyInfo });
    const pdfSizeBytes = pdf.byteLength;
    const pdfBase64 = pdf.toString("base64");
    const from = process.env.RESEND_FROM_EMAIL || "Cedur Reports <onboarding@resend.dev>";
    const replyTo = process.env.RESEND_REPLY_TO_EMAIL;
    const emailPayload: EmailPayload = {
      from,
      to: parsed.data.email,
      replyTo,
      subject: "Your Cedur Payroll Compliance Assessment Report",
      html: buildReportEmailHtml(result, companyInfo),
      text: `Your Cedur Payroll Compliance Assessment Report is attached. Score: ${result.score}/100 across ${result.totalEmployees} employees.`,
      attachments: [
        {
          filename: "cedur-payroll-compliance-assessment.pdf",
          content: pdfBase64,
          contentType: "application/pdf"
        }
      ],
      tags: [
        { name: "source", value: "free_report" },
        { name: "score", value: String(result.score) }
      ]
    };

    if (isReportDebugEnabled()) {
      console.info("send-report: generated PDF", JSON.stringify({ pdfSizeBytes, attachmentEncoding: "base64" }));
      if (isFullPayloadDebugEnabled()) {
        console.info("send-report: complete Resend payload", JSON.stringify(emailPayload));
      }
      console.info(
        "send-report: prepared Resend payload",
        JSON.stringify({
          ...emailPayload,
          htmlLength: emailPayload.html.length,
          html: emailPayload.html,
          pdfSizeBytes,
          attachmentEncoding: "base64",
          attachments: emailPayload.attachments.map((attachment) => ({
            filename: attachment.filename,
            contentType: attachment.contentType,
            contentEncoding: "base64",
            contentLength: attachment.content.length,
            originalPdfSizeBytes: pdfSizeBytes
          }))
        })
      );
    }

    const timeoutMs = resendTimeoutMs();
    const resendResponse = await sendEmailWithResend(apiKey, emailPayload, timeoutMs);
    const { data, error } = resendResponse;

    console.info("send-report: Resend response", JSON.stringify(resendResponse));

    if (error) {
      console.error("Resend report delivery failed", error);
      return NextResponse.json({ error: "Unable to send report email" }, { status: 502 });
    }

    await logReportDelivery({
      email: parsed.data.email,
      phone: parsed.data.phone,
      result
    });

    return NextResponse.json({ ok: true, emailId: data?.id });
  } catch (error) {
    console.error("Report email route failed", error);
    if (error instanceof ReportEmailTimeoutError || (error instanceof DOMException && error.name === "AbortError")) {
      return NextResponse.json({ error: "Report email service timed out. Please try again." }, { status: 504 });
    }
    return NextResponse.json({ error: "Unable to send report email" }, { status: 500 });
  }
}
