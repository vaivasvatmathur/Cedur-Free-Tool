"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComplianceRing } from "@/components/compliance-ring";
import { MetricCard } from "@/components/metric-card";
import { EmptyState } from "@/components/empty-state";
import { validatePayroll } from "@/lib/validation";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";
import { cn } from "@/lib/utils";

const categoriesMap = [
  { key: "EPF", label: "EPF Validation", desc: "12% employee contribution & 3.67% employer match audits" },
  { key: "EPS", label: "EPS Validation", desc: "Employer pension capping audits at Rs. 1,250 limit" },
  { key: "ESI", label: "ESI Validation", desc: "0.75% contribution checks on gross salaries <= Rs. 21,000" },
  { key: "Professional Tax", label: "Professional Tax Validation", desc: "State slab audits for MH, KA, and TN rules. Professional Tax rules vary by state and may change periodically. Results are based on configured state rules." },
  { key: "HRA", label: "HRA Validation", desc: "Verification of 3 statutory exemption routes (Old Regime)" },
  { key: "Tax Regime", label: "Tax Regime Validation", desc: "Exemption restrictions warning for New Tax Regime" }
];

export function ComplianceDashboard() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedRows = window.sessionStorage.getItem("cedur-payroll-rows");
    const savedCompany = window.sessionStorage.getItem("cedur-company-info");
    if (savedRows && JSON.parse(savedRows).length > 0) {
      setRows(JSON.parse(savedRows) as PayrollRow[]);
      setHasData(true);
    }
    if (savedCompany) {
      setCompanyInfo(JSON.parse(savedCompany) as CompanyInfo);
    }
    setLoading(false);
  }, []);

  const result = useMemo(() => {
    if (!rows.length) return null;
    return validatePayroll(rows, { payrollMonth: companyInfo?.payrollMonth });
  }, [rows, companyInfo?.payrollMonth]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-cedur-200 border-t-cedur-700" />
      </div>
    );
  }

  if (!hasData || !result) {
    return <EmptyState />;
  }

  const compliantCount = result.compliantEmployees;
  const warningCount = result.warningCount;

  const getRuleCounts = (category: string) => {
    const catIssues = result.issues.filter((issue) => issue.category === category);

    if (category === "EPF") {
      // Employee EPF Checks
      const empIssues = catIssues.filter((i) => i.checkType === "Employee EPF");
      const empFailures = empIssues.filter((i) => i.severity === "Critical").length;
      const empWarnings = empIssues.filter((i) => i.severity === "Warning").length;
      const empFailedOrWarnedEmpIds = new Set(
        empIssues.filter((i) => i.severity === "Critical" || i.severity === "Warning").map((i) => i.employeeId)
      );
      const empPasses = Math.max(0, result.totalEmployees - empFailedOrWarnedEmpIds.size);

      // Employer EPF Checks
      const emrIssues = catIssues.filter((i) => i.checkType === "Employer EPF");
      const emrFailures = emrIssues.filter((i) => i.severity === "Critical").length;
      const emrWarnings = emrIssues.filter((i) => i.severity === "Warning").length;
      const emrFailedOrWarnedEmpIds = new Set(
        emrIssues.filter((i) => i.severity === "Critical" || i.severity === "Warning").map((i) => i.employeeId)
      );
      const emrPasses = Math.max(0, result.totalEmployees - emrFailedOrWarnedEmpIds.size);

      return {
        passes: empPasses + emrPasses,
        warnings: empWarnings + emrWarnings,
        failures: empFailures + emrFailures
      };
    }

    if (category === "EPS") {
      const epsIssues = catIssues.filter((i) => i.checkType === "Employer EPS");
      const epsFailures = epsIssues.filter((i) => i.severity === "Critical").length;
      const epsWarnings = epsIssues.filter((i) => i.severity === "Warning").length;
      const epsFailedOrWarnedEmpIds = new Set(
        epsIssues.filter((i) => i.severity === "Critical" || i.severity === "Warning").map((i) => i.employeeId)
      );
      const epsPasses = Math.max(0, result.totalEmployees - epsFailedOrWarnedEmpIds.size);

      return {
        passes: epsPasses,
        warnings: epsWarnings,
        failures: epsFailures
      };
    }

    const failures = catIssues.filter((issue) => issue.severity === "Critical").length;
    const warnings = catIssues.filter((issue) => issue.severity === "Warning").length;
    
    // Employee is compliant/passed in this rule if no warnings/critical failures exist
    const failedOrWarnedEmpIds = new Set(
      catIssues.filter((i) => i.severity === "Critical" || i.severity === "Warning").map((i) => i.employeeId)
    );
    const passes = Math.max(0, result.totalEmployees - failedOrWarnedEmpIds.size);
    return { passes, warnings, failures };
  };

  const getScoreBracket = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 50) return "Needs Review";
    return "High Risk";
  };

  const currentBracket = getScoreBracket(result.score);

  return (
    <section className="page-shell py-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Compliance Dashboard</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Payroll health overview</h1>
          <p className="mt-2 text-muted-foreground">
            Auditing {companyInfo?.companyName || "your company's"} payroll for {companyInfo?.payrollMonth} {companyInfo?.financialYear}.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button asChild className="rounded-full bg-[#835ef5] hover:bg-[#724ee6] px-6 text-white">
            <Link href="/findings" className="flex items-center gap-2">
              View Detailed Findings
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full border-[#835ef5] text-[#835ef5] hover:bg-[#835ef5]/10 px-6">
            <Link href="/report" className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              Download Report
            </Link>
          </Button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <MetricCard label="Employees Checked" value={String(result.totalEmployees)} detail="Total payroll rows audited" icon={Users} tone="purple" />
        <MetricCard label="Compliance Score" value={`${result.score}%`} detail={`Benchmark: ${currentBracket}`} icon={ShieldCheck} tone="blue" />
        <MetricCard label="Fully Compliant Employees" value={String(compliantCount)} detail="Cleared with zero rules breached" icon={CheckCircle2} tone="green" />
        <MetricCard label="Employees Requiring Review" value={String(warningCount)} detail="Flagged with warnings, no critical issues" icon={AlertTriangle} tone="amber" />
        <MetricCard label="Critical Employees" value={String(result.criticalCount)} detail="Employees with critical issues" icon={ShieldAlert} tone="red" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        {/* Compliance Score Card */}
        <Card className="border border-slate-100 shadow-soft">
          <CardHeader>
            <CardTitle>Payroll Health Score</CardTitle>
            <CardDescription>Calculated from statutory compliance audit check points.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center">
            <ComplianceRing score={result.score} />
            <div className="mt-6 w-full space-y-2 border-t pt-4 text-sm">
              {[
                { name: "Excellent", range: "90–100", color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
                { name: "Good", range: "75–89", color: "text-[#2f26ff] bg-[#f0eeff] border-[#e9e6ff]" },
                { name: "Needs Review", range: "50–74", color: "text-amber-600 bg-amber-50 border-amber-200" },
                { name: "High Risk", range: "Below 50", color: "text-red-600 bg-red-50 border-red-200" }
              ].map((bracket) => {
                const isActive = currentBracket === bracket.name;
                return (
                  <div
                    key={bracket.name}
                    className={cn(
                      "flex items-center justify-between rounded-xl px-4 py-2 border transition",
                      isActive ? `${bracket.color} font-bold shadow-sm` : "text-muted-foreground border-transparent"
                    )}
                  >
                    <span>{bracket.name}</span>
                    <span>{bracket.range}</span>
                  </div>
                );
              })}
              <div className="pt-4 w-full">
                <Button asChild className="w-full rounded-full bg-[#835ef5] hover:bg-[#724ee6] text-white">
                  <Link href="/findings" className="flex items-center justify-center gap-2">
                    View Detailed Findings
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Rule-Based Recommendations */}
        <Card className="border border-slate-100 shadow-soft flex flex-col justify-between">
          <div>
            <CardHeader>
              <CardTitle>Rule-Based Recommendations</CardTitle>
              <CardDescription>Recommendations generated directly from uploaded payroll violations.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {result.recommendations.length > 0 ? (
                result.recommendations.map((recommendation, index) => (
                  <div key={recommendation} className="rounded-2xl border border-cedur-100 bg-cedur-50/20 p-4">
                    <Badge className="mb-2 bg-[#835ef5] text-white hover:bg-[#835ef5] border-none font-semibold px-3 py-1 rounded-full text-xs">Recommendation {index + 1}</Badge>
                    <p className="text-sm leading-6 text-slate-700 font-medium">{recommendation}</p>
                  </div>
                ))
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center py-10">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-3" />
                  <p className="font-semibold text-slate-800 text-base">Perfect Compliance Score</p>
                  <p className="text-sm text-muted-foreground mt-1 max-w-[280px]">
                    No statutory failures or anomalies were detected. Excel sheet is compliant.
                  </p>
                </div>
              )}
            </CardContent>
          </div>
          {result.recommendations.length > 0 && (
            <div className="p-6 pt-0 flex justify-end">
              <Button asChild className="rounded-full bg-[#835ef5] hover:bg-[#724ee6] px-6 text-white">
                <Link href="/findings">
                  View Detailed Findings
                </Link>
              </Button>
            </div>
          )}
        </Card>
      </div>

      {/* Rules Checked grid */}
      <div className="mt-8">
        <h2 className="text-xl font-bold tracking-normal text-slate-900 mb-4">Statutory Audits Log</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {categoriesMap.map((cat) => {
            const stats = getRuleCounts(cat.key);
            return (
              <Card key={cat.key} className="border border-slate-100 shadow-soft hover:shadow-md transition">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold">{cat.label}</CardTitle>
                  <CardDescription className="text-xs">{cat.desc}</CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-3 gap-2 border-t pt-3 text-center text-xs">
                  <div className="bg-emerald-50 text-emerald-700 rounded-xl p-2 border border-emerald-100">
                    <span className="block font-bold text-lg">{stats.passes}</span>
                    <span>Passed</span>
                  </div>
                  <div className="bg-amber-50 text-amber-700 rounded-xl p-2 border border-amber-100">
                    <span className="block font-bold text-lg">{stats.warnings}</span>
                    <span>Warning</span>
                  </div>
                  <div className="bg-red-50 text-red-700 rounded-xl p-2 border border-red-100">
                    <span className="block font-bold text-lg">{stats.failures}</span>
                    <span>Failed</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
