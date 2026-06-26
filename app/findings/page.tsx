"use client";

import React, { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Download, FileText } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { validatePayroll } from "@/lib/validation";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

const categories = [
  { key: "EPF", label: "EPF Findings", desc: "Employee EPF deductions (12%) and Employer EPF matching (3.67%) rules." },
  { key: "EPS", label: "EPS Findings", desc: "Employer Pension Scheme allocation and statutory Rs. 1,250 capping audits." },
  { key: "ESI", label: "ESI Findings", desc: "Employee State Insurance deductions (0.75%) on eligible salaries <= Rs. 21,000." },
  { key: "Professional Tax", label: "Professional Tax Findings", desc: "State slab verification and deductions for MH, KA, and TN. Professional Tax rules vary by state and may change periodically. Results are based on configured state rules." },
  { key: "HRA", label: "HRA Findings", desc: "Statutory 3-pronged rent and salary audits for Old Tax Regime exemptions." },
  { key: "Tax Regime", label: "Tax Regime Findings", desc: "Tax regime selection rules and HRA restriction alerts." }
];

export default function FindingsPage() {
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);
  const [expandedSection, setExpandedSection] = useState<string | null>("EPF");
  const [hoveredIssue, setHoveredIssue] = useState<{ title: string; content: ReactNode; rect: DOMRect } | null>(null);

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

  const getSectionStats = (categoryKey: string) => {
    const sectionIssues = result.issues.filter((i) => i.category === categoryKey);
    const failures = sectionIssues.filter((i) => i.severity === "Critical").length;
    const warnings = sectionIssues.filter((i) => i.severity === "Warning").length;
    const failedOrWarnedEmpIds = new Set(
      sectionIssues.filter((i) => i.severity === "Critical" || i.severity === "Warning").map((i) => i.employeeId)
    );
    const compliant = Math.max(0, result.totalEmployees - failedOrWarnedEmpIds.size);
    return { total: result.totalEmployees, compliant, warnings, failures, issuesList: sectionIssues };
  };

  const getValuesForCategory = (emp: PayrollRow, finding: any, categoryKey: string) => {
    if (categoryKey === "EPF") {
      return { expected: finding?.expectedEmployeeEpf, actual: emp.employeeEpf };
    }
    if (categoryKey === "EPS") {
      return { expected: finding?.expectedEmployerEps, actual: emp.employerEps };
    }
    if (categoryKey === "ESI") {
      return { expected: finding?.expectedEmployeeEsi, actual: emp.employeeEsi };
    }
    if (categoryKey === "Professional Tax") {
      return { expected: finding?.expectedProfessionalTax ?? 0, actual: emp.professionalTax };
    }
    if (categoryKey === "HRA") {
      return { expected: finding?.hraExemption, actual: finding?.hraExemption };
    }
    return { expected: emp.taxRegime === "New" ? 0 : finding?.hraExemption, actual: emp.taxRegime === "New" ? 0 : finding?.hraExemption };
  };

  const getTableRows = (catKey: string) => {
    if (catKey === "EPF") {
      const tableRows: any[] = [];
      rows.forEach((emp) => {
        const empIssues = result.issues.filter(i => i.employeeId === emp.employeeId && i.category === "EPF");
        const employeeEpfIssue = empIssues.find(i => i.checkType === "Employee EPF");
        const employerEpfIssue = empIssues.find(i => i.checkType === "Employer EPF");
        const finding = result.findings.find((f) => f.employeeId === emp.employeeId);

        tableRows.push({
          employeeId: emp.employeeId,
          employeeName: emp.employeeName,
          employeeIssue: employeeEpfIssue,
          employerIssue: employerEpfIssue,
          employeeExpected: finding?.expectedEmployeeEpf ?? 0,
          employeeActual: emp.employeeEpf,
          employerExpected: finding?.expectedEmployerEpf ?? 0,
          employerActual: emp.employerEpf,
          contributionType: employeeEpfIssue?.contributionType || employerEpfIssue?.contributionType
        });
      });
      return tableRows;
    }

    return rows.map((emp) => {
      const issue = result.issues.find((i) => i.employeeId === emp.employeeId && i.category === catKey);
      const finding = result.findings.find((f) => f.employeeId === emp.employeeId);
      const values = getValuesForCategory(emp, finding, catKey);
      return {
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        issue,
        expected: values.expected,
        actual: values.actual,
        contributionType: issue?.contributionType
      };
    });
  };

  const getSeverityBadgeClass = (severity: string) => {
    if (severity === "Critical") return "bg-red-50 text-red-700 border-red-205 hover:bg-red-50 rounded-full px-3 py-0.5 text-xs font-medium";
    if (severity === "Warning") return "bg-amber-50 text-amber-700 border-amber-205 hover:bg-amber-50 rounded-full px-3 py-0.5 text-xs font-medium";
    if (severity === "Observation") return "bg-blue-50 text-blue-700 border-blue-205 hover:bg-blue-50 rounded-full px-3 py-0.5 text-xs font-medium";
    return "bg-emerald-50 text-emerald-700 border-emerald-205 hover:bg-emerald-50 rounded-full px-3 py-0.5 text-xs font-medium";
  };

  return (
    <main>
      <Navbar />
      <section className="page-shell py-8">
        {/* Header with Download button */}
        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Detailed Findings</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">Category-wise compliance audits</h1>
            <p className="mt-2 text-muted-foreground">
              Granular statutory employee logs, expected calculations, and failure severities.
            </p>
          </div>
          <Button asChild className="rounded-full bg-[#835ef5] hover:bg-[#724ee6] px-6 self-start sm:self-center">
            <Link href="/report">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Link>
          </Button>
        </div>

        <div className="space-y-6">
          {categories.map((cat) => {
            const stats = getSectionStats(cat.key);
            const isExpanded = expandedSection === cat.key;
            const isFullyCompliant = stats.warnings === 0 && stats.failures === 0;

            return (
              <Card key={cat.key} className="overflow-hidden border border-slate-100 shadow-soft">
                {/* Header toggle bar */}
                <button
                  type="button"
                  onClick={() => setExpandedSection(isExpanded ? null : cat.key)}
                  className="flex w-full items-center justify-between bg-slate-50/60 p-5 text-left border-b hover:bg-slate-50 transition"
                >
                  <div>
                    <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-cedur-600" />
                      {cat.label}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">{cat.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2 text-xs font-semibold mr-4">
                      <span className="rounded-full bg-emerald-50 text-emerald-700 px-3 py-1 border border-emerald-200">
                        {stats.compliant} Compliant
                      </span>
                      {stats.warnings > 0 && (
                        <span className="rounded-full bg-amber-50 text-amber-700 px-3 py-1 border border-amber-200">
                          {stats.warnings} Warning{stats.warnings > 1 ? "s" : ""}
                        </span>
                      )}
                      {stats.failures > 0 && (
                        <span className="rounded-full bg-red-50 text-red-700 px-3 py-1 border border-red-200">
                          {stats.failures} Failed
                        </span>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-500" /> : <ChevronDown className="h-5 w-5 text-slate-500" />}
                  </div>
                </button>

                {isExpanded && (
                  <CardContent className="p-6">
                    {isFullyCompliant ? (
                      /* Success Banner when 0 warnings and 0 failures */
                      <div className="flex flex-col items-center justify-center text-center py-10 px-4 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/40 via-white to-white shadow-sm">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-4 border border-emerald-100">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold text-emerald-950">✓ No Compliance Issues Detected</h3>
                        <p className="mt-2 text-sm text-emerald-800/80 max-w-md leading-6">
                          All employees passed this validation category successfully. 100% compliant for this rule set.
                        </p>
                        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-xl border-t pt-5 text-xs font-semibold">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="block text-lg font-bold text-slate-800">{stats.total}</span>
                            <span className="text-slate-500">Employees Audited</span>
                          </div>
                          <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-100">
                            <span className="block text-lg font-bold text-emerald-900">{stats.compliant}</span>
                            <span className="text-emerald-700">Employees Compliant</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="block text-lg font-bold text-slate-700">{stats.warnings}</span>
                            <span className="text-slate-500">Warnings</span>
                          </div>
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                            <span className="block text-lg font-bold text-slate-700">{stats.failures}</span>
                            <span className="text-slate-500">Failures</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Table layout showing all employees when warning/failures exist */
                      <div>
                        {/* Findings Metrics summary cards */}
                        <div className="grid gap-4 sm:grid-cols-4 mb-6">
                          <div className="rounded-xl border p-4 bg-slate-50/35">
                            <p className="text-xs font-semibold text-muted-foreground">Total Checked</p>
                            <p className="text-2xl font-bold mt-1">{stats.total}</p>
                          </div>
                          <div className="rounded-xl border p-4 bg-emerald-50/10 border-emerald-100">
                            <p className="text-xs font-semibold text-emerald-700">Compliant</p>
                            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.compliant}</p>
                          </div>
                          <div className="rounded-xl border p-4 bg-amber-50/10 border-amber-100">
                            <p className="text-xs font-semibold text-amber-700">Warnings</p>
                            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.warnings}</p>
                          </div>
                          <div className="rounded-xl border p-4 bg-red-50/10 border-red-100">
                            <p className="text-xs font-semibold text-red-700">Failures</p>
                            <p className="text-2xl font-bold text-red-605 mt-1">{stats.failures}</p>
                          </div>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-slate-100 shadow-soft">
                          <table className="min-w-full divide-y divide-slate-100 text-sm">
                            {cat.key === "EPF" ? (
                              <>
                                <thead className="bg-slate-50/65 font-bold text-slate-800">
                                  <tr>
                                    <th className="px-6 py-3 text-left">Employee ID</th>
                                    <th className="px-6 py-3 text-left">Name</th>
                                    <th className="px-6 py-3 text-center">Employee EPF</th>
                                    <th className="px-6 py-3 text-center">Employer EPF</th>
                                    <th className="px-6 py-3 text-center">Overall EPF Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                                  {getTableRows(cat.key).map((item, index) => {
                                    const empSev = item.employeeIssue && item.employeeIssue.severity !== "Info"
                                      ? item.employeeIssue.severity
                                      : "Compliant";
                                    const empMsg = item.employeeIssue ? item.employeeIssue.message : "Employee EPF contribution is compliant.";

                                    const employerSev = item.employerIssue && item.employerIssue.severity !== "Info"
                                      ? item.employerIssue.severity
                                      : "Compliant";
                                    const employerMsg = item.employerIssue ? item.employerIssue.message : "Employer EPF contribution is compliant.";

                                    let overallSev = "Compliant";
                                    if (empSev === "Critical" || employerSev === "Critical") {
                                      overallSev = "Critical";
                                    } else if (empSev === "Warning" || employerSev === "Warning") {
                                      overallSev = "Warning";
                                    }

                                    return (
                                      <tr key={`${item.employeeId}-${index}`} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 font-semibold text-slate-900">{item.employeeId}</td>
                                        <td className="px-6 py-4">
                                          <div className="font-medium text-slate-900">{item.employeeName}</div>
                                          {item.contributionType && (
                                            <Badge variant="outline" className="mt-1 text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 font-medium whitespace-nowrap">
                                              {item.contributionType}
                                            </Badge>
                                          )}
                                        </td>
                                        
                                        {/* Employee EPF */}
                                        <td className="px-6 py-4 text-center">
                                          <div
                                            className="cursor-pointer inline-block"
                                            onMouseEnter={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setHoveredIssue({
                                                title: "Employee EPF Share",
                                                content: (
                                                  <div className="space-y-1.5 text-xs">
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">Expected:</span>
                                                      <span className="font-semibold text-slate-800">Rs. {item.employeeExpected.toLocaleString("en-IN")}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">Actual:</span>
                                                      <span className="font-semibold text-slate-800">Rs. {item.employeeActual.toLocaleString("en-IN")}</span>
                                                    </div>
                                                    <div className="border-t pt-1.5 mt-1 text-slate-600 font-medium">
                                                      {empMsg}
                                                    </div>
                                                    {item.employeeIssue?.recommendation && (
                                                      <div className="text-slate-500 mt-1 italic leading-relaxed">
                                                        Rec: {item.employeeIssue.recommendation}
                                                      </div>
                                                    )}
                                                  </div>
                                                ),
                                                rect
                                              });
                                            }}
                                            onMouseLeave={() => setHoveredIssue(null)}
                                          >
                                            <Badge variant="outline" className={getSeverityBadgeClass(empSev)}>
                                              {empSev}
                                            </Badge>
                                          </div>
                                        </td>

                                        {/* Employer EPF */}
                                        <td className="px-6 py-4 text-center">
                                          <div
                                            className="cursor-pointer inline-block"
                                            onMouseEnter={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setHoveredIssue({
                                                title: "Employer EPF Share",
                                                content: (
                                                  <div className="space-y-1.5 text-xs">
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">Expected:</span>
                                                      <span className="font-semibold text-slate-800">Rs. {item.employerExpected.toLocaleString("en-IN")}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">Actual:</span>
                                                      <span className="font-semibold text-slate-800">Rs. {item.employerActual.toLocaleString("en-IN")}</span>
                                                    </div>
                                                    <div className="border-t pt-1.5 mt-1 text-slate-600 font-medium">
                                                      {employerMsg}
                                                    </div>
                                                    {item.employerIssue?.recommendation && (
                                                      <div className="text-slate-500 mt-1 italic leading-relaxed">
                                                        Rec: {item.employerIssue.recommendation}
                                                      </div>
                                                    )}
                                                  </div>
                                                ),
                                                rect
                                              });
                                            }}
                                            onMouseLeave={() => setHoveredIssue(null)}
                                          >
                                            <Badge variant="outline" className={getSeverityBadgeClass(employerSev)}>
                                              {employerSev}
                                            </Badge>
                                          </div>
                                        </td>

                                        {/* Overall EPF Status */}
                                        <td className="px-6 py-4 text-center">
                                          <div
                                            className="cursor-pointer inline-block"
                                            onMouseEnter={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setHoveredIssue({
                                                title: "Overall EPF Compliance",
                                                content: (
                                                  <div className="space-y-1.5 text-xs">
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">Employee EPF Status:</span>
                                                      <span className={cn("font-semibold", empSev === "Compliant" ? "text-emerald-700" : empSev === "Warning" ? "text-amber-700" : "text-red-700")}>{empSev}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                      <span className="text-slate-500">Employer EPF Status:</span>
                                                      <span className={cn("font-semibold", employerSev === "Compliant" ? "text-emerald-700" : employerSev === "Warning" ? "text-amber-700" : "text-red-700")}>{employerSev}</span>
                                                    </div>
                                                    <div className="border-t pt-1.5 mt-1 text-slate-500 italic leading-relaxed">
                                                      Overall status is determined by the most severe sub-check. Hover over individual status badges for detailed breakdowns.
                                                    </div>
                                                  </div>
                                                ),
                                                rect
                                              });
                                            }}
                                            onMouseLeave={() => setHoveredIssue(null)}
                                          >
                                            <Badge variant="outline" className={getSeverityBadgeClass(overallSev)}>
                                              {overallSev}
                                            </Badge>
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </>
                            ) : (
                              <>
                                <thead className="bg-slate-50/65 font-bold text-slate-800">
                                  <tr>
                                    <th className="px-6 py-3 text-left">Employee ID</th>
                                    <th className="px-6 py-3 text-left">Name</th>
                                    <th className="px-6 py-3 text-left">Statutory Issue Detail</th>
                                    <th className="px-6 py-3 text-right">Expected</th>
                                    <th className="px-6 py-3 text-right">Actual</th>
                                    <th className="px-6 py-3 text-center">Severity</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 bg-white text-slate-700">
                                  {getTableRows(cat.key).map((item, index) => {
                                    const issue = item.issue;
                                    const severity = issue && issue.severity !== "Info"
                                      ? issue.severity 
                                      : "Compliant";
                                    
                                    const displayIssueText = issue
                                      ? issue.message 
                                      : "Compliant";

                                    return (
                                      <tr key={`${item.employeeId}-${index}`} className="hover:bg-slate-50/50 transition">
                                        <td className="px-6 py-4 font-semibold text-slate-900">{item.employeeId}</td>
                                        <td className="px-6 py-4">
                                          <div className="font-medium text-slate-900">{item.employeeName}</div>
                                          {item.contributionType && (
                                            <Badge variant="outline" className="mt-1 text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200 font-medium whitespace-nowrap">
                                              {item.contributionType}
                                            </Badge>
                                          )}
                                        </td>
                                        <td className="px-6 py-4">
                                          <div 
                                            className="cursor-pointer max-w-[280px]"
                                            onMouseEnter={(e) => {
                                              const rect = e.currentTarget.getBoundingClientRect();
                                              setHoveredIssue({
                                                title: "Statutory Check Detail",
                                                content: <div className="leading-relaxed">{displayIssueText}</div>,
                                                rect
                                              });
                                            }}
                                            onMouseLeave={() => setHoveredIssue(null)}
                                          >
                                            <p className="truncate text-slate-800 text-xs font-medium max-w-[260px] hover:text-[#835ef5] hover:underline">
                                              {displayIssueText}
                                            </p>
                                          </div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                          {item.expected !== undefined ? `Rs. ${item.expected.toLocaleString("en-IN")}` : "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">
                                          {item.actual !== undefined ? `Rs. ${item.actual.toLocaleString("en-IN")}` : "N/A"}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                          <Badge variant="outline" className={getSeverityBadgeClass(severity)}>
                                            {severity}
                                          </Badge>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </>
                            )}
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </section>

      {hoveredIssue && typeof window !== "undefined" && createPortal(
        <div
          style={{
            position: "fixed",
            top: `${hoveredIssue.rect.top - 8}px`,
            left: `${hoveredIssue.rect.left}px`,
            transform: "translateY(-100%)",
          }}
          className="z-[9999] w-[320px] rounded-xl border border-slate-200 bg-white p-4 text-xs font-normal text-slate-700 shadow-xl pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-normal"
        >
          <div className="font-semibold text-slate-805 mb-1.5 text-[#835ef5]">{hoveredIssue.title}</div>
          <div className="leading-relaxed">{hoveredIssue.content}</div>
        </div>,
        document.body
      )}
    </main>
  );
}
