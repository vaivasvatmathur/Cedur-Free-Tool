"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, CalendarCheck, FileDown, MailCheck, MessageCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ReportActions } from "@/components/report-actions";
import { generateCompliancePdf } from "@/lib/report";
import { sampleCompanyInfo, samplePayrollRows } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";
import { useComplianceRules } from "@/hooks/use-compliance-rules";

type Contact = {
  email?: string;
  phone?: string;
};

export function SuccessContent() {
  const [contact, setContact] = useState<Contact>({});
  const { ruleMap, ptRules, isLoading } = useComplianceRules();

  useEffect(() => {
    if (isLoading) return;

    const savedContact = window.sessionStorage.getItem("cedur-report-contact");
    const savedRows = window.sessionStorage.getItem("cedur-payroll-rows");
    const savedCompany = window.sessionStorage.getItem("cedur-company-info");
    const rows = savedRows ? (JSON.parse(savedRows) as PayrollRow[]) : samplePayrollRows;
    const companyInfo = savedCompany ? (JSON.parse(savedCompany) as CompanyInfo) : sampleCompanyInfo;

    if (savedContact) setContact(JSON.parse(savedContact) as Contact);
    generateCompliancePdf(validatePayroll(rows, { payrollMonth: companyInfo.payrollMonth, rules: ruleMap, ptRules }), companyInfo);
  }, [isLoading, ptRules, ruleMap]);

  return (
    <section className="page-shell py-10">
      <Card className="overflow-hidden">
        <CardContent className="grid gap-8 p-8 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-5 w-fit rounded-2xl bg-emerald-50 p-4 text-emerald-700">
              <FileDown className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold tracking-normal">Your Payroll Compliance Report Is Ready</h1>
            <p className="mt-4 max-w-2xl text-muted-foreground">
              Your report has been successfully prepared and emailed to your provided work email.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {contact.email && (
                <Badge variant="success" className="gap-2">
                  <MailCheck className="h-4 w-4" />
                  Sent to Email
                </Badge>
              )}
              {contact.phone && (
                <Badge variant="success" className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Requested
                </Badge>
              )}
            </div>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <ReportActions />
              <Button variant="outline" asChild>
                <Link href="/payslips">
                  <Sparkles className="h-4 w-4" />
                  Generate Payslips
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl bg-cedur-50 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Next with Cedur HRMS</p>
            <h2 className="mt-3 text-2xl font-bold">Automate payroll compliance workflows in one system.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Move from manual payroll checks to repeatable validation, approvals, and statutory reporting.
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button>
                <CalendarCheck className="h-4 w-4" />
                Book Free Demo
              </Button>
              <Button variant="outline">
                Explore HRMS
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
