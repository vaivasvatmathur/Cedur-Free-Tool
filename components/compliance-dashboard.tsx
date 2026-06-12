"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ShieldAlert, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComplianceRing } from "@/components/compliance-ring";
import { DashboardTable } from "@/components/dashboard-table";
import { MetricCard } from "@/components/metric-card";
import { sampleCompanyInfo, samplePayrollRows } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";
import { useComplianceRules } from "@/hooks/use-compliance-rules";

export function ComplianceDashboard() {
  const [rows, setRows] = useState<PayrollRow[]>(samplePayrollRows);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(sampleCompanyInfo);
  const { ruleMap, ptRules } = useComplianceRules();

  useEffect(() => {
    const savedRows = window.sessionStorage.getItem("cedur-payroll-rows");
    const savedCompany = window.sessionStorage.getItem("cedur-company-info");
    if (savedRows) setRows(JSON.parse(savedRows) as PayrollRow[]);
    if (savedCompany) setCompanyInfo(JSON.parse(savedCompany) as CompanyInfo);
  }, []);

  const result = useMemo(() => validatePayroll(rows, { payrollMonth: companyInfo.payrollMonth, rules: ruleMap, ptRules }), [rows, companyInfo.payrollMonth, ruleMap, ptRules]);
  const compliancePercentage = result.totalEmployees ? Math.round((result.compliantEmployees / result.totalEmployees) * 100) : 0;

  return (
    <section className="page-shell py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Compliance Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Payroll health overview</h1>
          <p className="mt-2 text-muted-foreground">EPF, EPS, ESI, Professional Tax, HRA, and tax-regime validation for Indian payroll data.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/report">
              <Download className="h-4 w-4" />
              Download Report
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Employees Checked" value={String(result.totalEmployees)} detail={`${companyInfo.payrollMonth} ${companyInfo.financialYear}`} icon={Users} tone="blue" />
        <MetricCard label="Compliance Percentage" value={`${compliancePercentage}%`} detail={`${result.compliantEmployees} employees clear`} icon={CheckCircle2} tone="green" />
        <MetricCard label="Critical Issues" value={String(result.criticalCount)} detail="Needs immediate correction" icon={ShieldAlert} tone="red" />
        <MetricCard label="Compliance Warnings" value={String(result.warningCount)} detail="Review before payroll run" icon={AlertTriangle} tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle>Payroll Health Score</CardTitle>
            <CardDescription>100 minus statutory issue deductions: critical -10, warning -5, info -2.</CardDescription>
          </CardHeader>
          <CardContent className="grid place-items-center">
            <ComplianceRing score={result.score} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Rule-Based Recommendations</CardTitle>
            <CardDescription>No AI integration; recommendations are derived from detected statutory failures.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {result.recommendations.map((recommendation, index) => (
              <div key={recommendation} className="rounded-2xl border bg-cedur-50/40 p-4">
                <Badge className="mb-3">Recommendation {index + 1}</Badge>
                <p className="text-sm leading-6 text-slate-700">{recommendation}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Employee Compliance Log</CardTitle>
          <CardDescription>Employee-level compliance status, primary issue, severity, and status.</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardTable logs={result.employeeLogs} />
        </CardContent>
      </Card>
    </section>
  );
}
