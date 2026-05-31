"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Plus, ShieldCheck, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parsePayrollFile } from "@/lib/file-parser";
import { requiredUploadColumns, validatePayroll } from "@/lib/validation";
import { sampleCompanyInfo, samplePayrollRows } from "@/lib/sample-data";
import type { CompanyInfo, PayrollRow, TaxRegime } from "@/types/payroll";

const blankEmployee = (state = "Maharashtra"): PayrollRow => ({
  employeeId: "",
  employeeName: "",
  department: "General",
  state,
  basicSalary: 0,
  dearnessAllowance: 0,
  grossSalary: 0,
  hraReceived: 0,
  annualRentPaid: 0,
  metroCity: false,
  employeeEpf: 0,
  employerEpf: 0,
  employerEps: 0,
  employeeEsi: 0,
  professionalTax: 0,
  taxRegime: "Old"
});

function savePayrollSession(rows: PayrollRow[], companyInfo: CompanyInfo) {
  window.sessionStorage.setItem("cedur-payroll-rows", JSON.stringify(rows));
  window.sessionStorage.setItem("cedur-company-info", JSON.stringify(companyInfo));
}

export function UploadWorkflow() {
  const router = useRouter();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(sampleCompanyInfo);
  const [fileName, setFileName] = useState<string>("sample-payroll.csv");
  const [rows, setRows] = useState<PayrollRow[]>(samplePayrollRows);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const result = useMemo(() => validatePayroll(rows, { payrollMonth: companyInfo.payrollMonth }), [rows, companyInfo.payrollMonth]);

  async function handleFile(file?: File) {
    if (!file) return;
    setIsParsing(true);
    setMissingColumns([]);
    setFileName(file.name);
    setProgress(24);
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/upload", { method: "POST", body: formData }).catch(() => undefined);
    const parsed = await parsePayrollFile(file);
    setProgress(72);
    if (parsed.missingColumns.length) {
      setRows([]);
      setMissingColumns(parsed.missingColumns);
    } else {
      setRows(parsed.rows);
      savePayrollSession(parsed.rows, companyInfo);
    }
    setTimeout(() => {
      setProgress(100);
      setIsParsing(false);
    }, 450);
  }

  function proceedToDashboard() {
    savePayrollSession(rows, companyInfo);
    router.push("/dashboard");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-br from-white to-cedur-50/70">
          <CardTitle>Upload Payroll File</CardTitle>
          <CardDescription>Validate EPF, EPS, ESI, PT, HRA, and tax-regime compliance from a CSV or XLSX file.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <label
            htmlFor="payroll-file"
            className="flex min-h-[300px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cedur-200 bg-cedur-50/45 p-6 text-center transition hover:border-cedur-400 hover:bg-cedur-50"
          >
            <div className="rounded-2xl bg-white p-4 text-cedur-700 shadow-soft">
              <UploadCloud className="h-9 w-9" />
            </div>
            <h2 className="mt-5 text-2xl font-bold">Drag and drop payroll file</h2>
            <p className="mt-2 max-w-md text-sm text-muted-foreground">Supports .csv, .xlsx, and .xls with the statutory payroll columns listed below.</p>
            <Button className="mt-5" type="button">Choose File</Button>
            <input id="payroll-file" type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
          </label>

          {missingColumns.length > 0 && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              <p className="font-semibold">Upload errors: missing required columns</p>
              <p className="mt-2">{missingColumns.join(", ")}</p>
            </div>
          )}

          <div className="mt-5 rounded-2xl border bg-white p-4">
            <p className="text-sm font-semibold">Required columns</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {requiredUploadColumns.map((column) => (
                <Badge key={column} variant="outline">{column}</Badge>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-2xl border bg-white p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-3 text-emerald-700">
                  <FileSpreadsheet className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{fileName}</p>
                  <p className="text-sm text-muted-foreground">{rows.length} employees ready for validation</p>
                </div>
              </div>
              <Badge variant={result.criticalCount ? "warning" : "success"}>{result.score}% compliant</Badge>
            </div>
            <AnimatePresence>
              {(isParsing || progress > 0) && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-4">
                  <Progress value={progress} />
                  <p className="mt-2 text-xs text-muted-foreground">{isParsing ? "Checking required columns and statutory payroll rules..." : "Validation complete"}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={proceedToDashboard} className="sm:w-auto" disabled={!rows.length || missingColumns.length > 0}>View Compliance Dashboard</Button>
            <Button variant="outline" onClick={() => router.push("/report")} className="sm:w-auto">Get Detailed Report</Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-cedur-700" />
              Validation Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              ["EPF scan", result.issues.some((issue) => issue.category === "EPF")],
              ["EPS scan", result.issues.some((issue) => issue.category === "EPS")],
              ["ESI scan", result.issues.some((issue) => issue.category === "ESI")],
              ["PT and HRA scan", result.issues.some((issue) => ["Professional Tax", "HRA", "Tax Regime"].includes(issue.category))]
            ].map(([label, hasIssue]) => (
              <div key={String(label)} className="flex items-center justify-between rounded-xl bg-muted/60 p-3">
                <span className="text-sm font-medium">{label}</span>
                {hasIssue ? <AlertTriangle className="h-4 w-4 text-amber-600" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Statutory Rules</CardTitle>
            <CardDescription>Deterministic validation for Indian payroll compliance.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <RuleCard title="EPF + EPS" copy="Employee EPF is 12% of Basic + DA. Employer EPF is 3.67%; EPS is 8.33% capped at Rs. 1,250." />
            <RuleCard title="ESI" copy="Gross salary up to Rs. 21,000 requires employee ESI at 0.75%." />
            <RuleCard title="PT + HRA" copy="PT supports Maharashtra, Karnataka, Tamil Nadu, and Delhi. HRA exemption applies only under Old Regime." />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ManualEntryWorkflow() {
  const router = useRouter();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(sampleCompanyInfo);
  const [manualRows, setManualRows] = useState<PayrollRow[]>([blankEmployee(sampleCompanyInfo.state)]);
  const result = useMemo(() => validatePayroll(manualRows, { payrollMonth: companyInfo.payrollMonth }), [manualRows, companyInfo.payrollMonth]);

  function updateManualRow(index: number, patch: Partial<PayrollRow>) {
    setManualRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function proceedToDashboard() {
    savePayrollSession(manualRows, companyInfo);
    router.push("/dashboard");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-br from-white to-cedur-50/70">
          <CardTitle>Enter Employee Data Manually</CardTitle>
          <CardDescription>For smaller teams, enter company and employee payroll details without uploading a file.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <ManualEntryForm
            companyInfo={companyInfo}
            setCompanyInfo={setCompanyInfo}
            rows={manualRows}
            setRows={setManualRows}
            updateRow={updateManualRow}
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={proceedToDashboard} className="sm:w-auto" disabled={!manualRows.length}>Validate Compliance</Button>
            <Button variant="outline" onClick={() => router.push("/upload")} className="sm:w-auto">Upload File Instead</Button>
          </div>
        </CardContent>
      </Card>
      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-cedur-700" />
            Manual Validation Preview
          </CardTitle>
          <CardDescription>{manualRows.length} employee record{manualRows.length === 1 ? "" : "s"} ready.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Badge variant={result.criticalCount ? "warning" : "success"}>{result.score}% compliant</Badge>
          <RuleCard title="Checks Included" copy="EPF, EPS, ESI, PT, HRA, and tax-regime findings will appear on the dashboard." />
        </CardContent>
      </Card>
    </div>
  );
}

function RuleCard({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{copy}</p>
    </div>
  );
}

function ManualEntryForm({
  companyInfo,
  setCompanyInfo,
  rows,
  setRows,
  updateRow
}: {
  companyInfo: CompanyInfo;
  setCompanyInfo: (info: CompanyInfo) => void;
  rows: PayrollRow[];
  setRows: (rows: PayrollRow[]) => void;
  updateRow: (index: number, patch: Partial<PayrollRow>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 rounded-2xl border bg-white p-4 md:grid-cols-2">
        <Field label="Company Name" value={companyInfo.companyName} onChange={(value) => setCompanyInfo({ ...companyInfo, companyName: value })} />
        <SelectField
          label="State"
          value={companyInfo.state}
          options={["Maharashtra", "Karnataka", "Tamil Nadu", "Delhi"]}
          onChange={(value) => {
            setCompanyInfo({ ...companyInfo, state: value });
            setRows(rows.map((row) => ({ ...row, state: value })));
          }}
        />
        <Field label="Payroll Month" value={companyInfo.payrollMonth} onChange={(value) => setCompanyInfo({ ...companyInfo, payrollMonth: value })} />
        <Field label="Financial Year" value={companyInfo.financialYear} onChange={(value) => setCompanyInfo({ ...companyInfo, financialYear: value })} />
      </div>

      {rows.map((row, index) => (
        <div key={index} className="rounded-2xl border bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <p className="font-semibold">Employee {index + 1}</p>
            <Badge variant="outline">{row.taxRegime} Regime</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Employee ID" value={row.employeeId} onChange={(value) => updateRow(index, { employeeId: value })} />
            <Field label="Employee Name" value={row.employeeName} onChange={(value) => updateRow(index, { employeeName: value })} />
            <NumberField label="Basic Salary" value={row.basicSalary} onChange={(value) => updateRow(index, { basicSalary: value })} />
            <NumberField label="Dearness Allowance" value={row.dearnessAllowance} onChange={(value) => updateRow(index, { dearnessAllowance: value })} />
            <NumberField label="Gross Salary" value={row.grossSalary} onChange={(value) => updateRow(index, { grossSalary: value })} />
            <NumberField label="HRA Received" value={row.hraReceived} onChange={(value) => updateRow(index, { hraReceived: value })} />
            <NumberField label="Annual Rent Paid" value={row.annualRentPaid} onChange={(value) => updateRow(index, { annualRentPaid: value })} />
            <SelectField label="Metro City" value={row.metroCity ? "Yes" : "No"} options={["Yes", "No"]} onChange={(value) => updateRow(index, { metroCity: value === "Yes" })} />
            <NumberField label="Employee EPF Deduction" value={row.employeeEpf} onChange={(value) => updateRow(index, { employeeEpf: value })} />
            <NumberField label="Employer EPF Contribution" value={row.employerEpf} onChange={(value) => updateRow(index, { employerEpf: value })} />
            <NumberField label="Employer EPS Contribution" value={row.employerEps} onChange={(value) => updateRow(index, { employerEps: value })} />
            <NumberField label="Employee ESI Deduction" value={row.employeeEsi} onChange={(value) => updateRow(index, { employeeEsi: value })} />
            <NumberField label="Professional Tax Deduction" value={row.professionalTax} onChange={(value) => updateRow(index, { professionalTax: value })} />
            <SelectField label="Tax Regime" value={row.taxRegime} options={["Old", "New"]} onChange={(value) => updateRow(index, { taxRegime: value as TaxRegime })} />
          </div>
        </div>
      ))}

      <Button variant="outline" onClick={() => setRows([...rows, blankEmployee(companyInfo.state)])}>
        <Plus className="h-4 w-4" />
        Add Another Employee
      </Button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type="number" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select className="flex h-11 w-full rounded-xl border border-input bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  );
}
