"use client";

import { useEffect, useMemo, useState } from "react";
import { FileCheck2, LockKeyhole, MailCheck } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { LeadForm } from "@/components/lead-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ComplianceRing } from "@/components/compliance-ring";
import { EmptyState } from "@/components/empty-state";
import { sampleCompanyInfo } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";

export default function ReportPage() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(sampleCompanyInfo);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedRows = window.sessionStorage.getItem("cedur-payroll-rows");
    const savedCompany = window.sessionStorage.getItem("cedur-company-info");
    if (savedRows && JSON.parse(savedRows).length > 0) {
      setRows(JSON.parse(savedRows) as PayrollRow[]);
      setHasData(true);
    }
    if (savedCompany) setCompanyInfo(JSON.parse(savedCompany) as CompanyInfo);
    setLoading(false);
  }, []);

  const result = useMemo(() => {
    if (!rows.length) return null;
    return validatePayroll(rows, { payrollMonth: companyInfo.payrollMonth });
  }, [rows, companyInfo.payrollMonth]);

  if (loading) {
    return (
      <main>
        <Navbar />
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-cedur-200 border-t-cedur-700" />
        </div>
      </main>
    );
  }

  if (!hasData || !result) {
    return (
      <main>
        <Navbar />
        <EmptyState />
      </main>
    );
  }

  return (
    <main>
      <Navbar />
      <section className="page-shell grid min-h-[calc(100vh-64px)] gap-8 py-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Report Delivery</p>
          <h1 className="mt-3 max-w-2xl text-4xl font-bold tracking-normal">Your Detailed Payroll Compliance Report Is Ready</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Enter your work email or phone number to receive the full PDF and CSV compliance summary.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              ["PDF report", FileCheck2],
              ["Secure delivery", LockKeyhole],
              ["Instant access", MailCheck]
            ].map(([label, Icon]) => (
              <div key={String(label)} className="rounded-2xl border bg-white p-4 shadow-card">
                <Icon className="h-5 w-5 text-cedur-700" />
                <p className="mt-3 text-sm font-semibold">{label as string}</p>
              </div>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-cedur-50 to-white">
            <CardTitle>Unlock Free Report</CardTitle>
            <CardDescription>Includes EPF, EPS, ESI, PT, HRA, tax-regime findings, and employee summaries.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 p-6 md:grid-cols-[0.72fr_1fr]">
            <div className="grid place-items-center rounded-2xl bg-muted/50 p-4">
              <ComplianceRing score={result.score} size="sm" />
            </div>
            <LeadForm />
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
