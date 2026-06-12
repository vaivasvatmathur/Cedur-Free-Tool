"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock3, Loader2, Plus, RotateCcw, ShieldCheck, UploadCloud, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { parsePayrollFile } from "@/lib/file-parser";
import { requiredUploadColumns, validatePayroll } from "@/lib/validation";
import { sampleCompanyInfo } from "@/lib/sample-data";
import type { CompanyInfo, PayrollRow, TaxRegime } from "@/types/payroll";
import { useComplianceRules } from "@/hooks/use-compliance-rules";

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
  const [uploadState, setUploadState] = useState<"empty" | "uploaded">("empty");
  const [fileName, setFileName] = useState<string>("");
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [missingColumns, setMissingColumns] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [isParsing, setIsParsing] = useState(false);
  const [uploadedAt, setUploadedAt] = useState<Date | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const { ruleMap, ptRules } = useComplianceRules();
  const result = useMemo(() => validatePayroll(rows, { payrollMonth: companyInfo.payrollMonth, rules: ruleMap, ptRules }), [rows, companyInfo.payrollMonth, ruleMap, ptRules]);

  async function handleFile(file?: File) {
    if (!file) return;
    setIsParsing(true);
    setMissingColumns([]);
    setFileName(file.name);
    setRows([]);
    setUploadState("empty");
    setUploadedAt(null);
    setProgress(24);
    const formData = new FormData();
    formData.append("file", file);
    fetch("/api/upload", { method: "POST", body: formData }).catch(() => undefined);
    const parsed = await parsePayrollFile(file);
    setProgress(72);
    if (parsed.missingColumns.length) {
      setRows([]);
      setMissingColumns(parsed.missingColumns);
      setFileName("");
      setUploadedAt(null);
      setUploadState("empty");
      setProgress(0);
      setIsParsing(false);
      return;
    } else {
      setRows(parsed.rows);
      setUploadedAt(new Date());
      setUploadState("uploaded");
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

  function resetUpload() {
    setUploadState("empty");
    setFileName("");
    setRows([]);
    setMissingColumns([]);
    setProgress(0);
    setIsParsing(false);
    setUploadedAt(null);
    setFileInputKey((key) => key + 1);
  }

  return (
    <div className="grid gap-6">
      <Card className="overflow-hidden">
        <CardHeader className="border-b bg-gradient-to-br from-white to-cedur-50/70">
          <CardTitle>Upload Payroll File</CardTitle>
          <CardDescription>Validate EPF, EPS, ESI, PT, HRA, and tax-regime compliance from a CSV or XLSX file.</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            {uploadState === "empty" ? (
              <motion.div
                key="empty-upload"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
              >
                <label
                  htmlFor="payroll-file"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    handleFile(event.dataTransfer.files?.[0]);
                  }}
                  className="flex min-h-[260px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-cedur-200 bg-cedur-50/45 p-6 text-center transition hover:border-cedur-400 hover:bg-cedur-50"
                >
                  <div className="rounded-2xl bg-white p-4 text-cedur-700 shadow-soft">
                    <UploadCloud className="h-9 w-9" />
                  </div>
                  <h2 className="mt-5 text-2xl font-bold">Drag and drop payroll file</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">Supports .csv, .xlsx, and .xls with the statutory payroll columns listed below.</p>
                  <Button className="mt-5" type="button" disabled={isParsing}>{isParsing ? "Processing..." : "Choose File"}</Button>
                  <input key={fileInputKey} id="payroll-file" type="file" accept=".csv,.xlsx,.xls" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />
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
              </motion.div>
            ) : (
              <motion.div
                key="uploaded-success"
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                transition={{ duration: 0.24 }}
                className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                  <div className="flex gap-4">
                    <div className="relative h-14 w-14 shrink-0">
                      <motion.span
                        className="absolute inset-0 rounded-full bg-emerald-300/40"
                        animate={{ scale: [1, 1.22, 1], opacity: [0.55, 0.12, 0.55] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        initial={{ scale: 0.72, rotate: -12 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 360, damping: 18 }}
                        className="absolute inset-1 flex items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm"
                      >
                        <CheckCircle2 className="h-7 w-7" />
                      </motion.div>
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold tracking-normal text-emerald-950">File Uploaded Successfully</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{fileName} is ready for compliance validation.</p>
                    </div>
                  </div>
                  <Badge variant={result.criticalCount ? "warning" : "success"}>{result.score}% compliant</Badge>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <UploadMetaItem label="File Name" value={fileName} />
                  <UploadMetaItem label="Employees Detected" value={`${rows.length} employee${rows.length === 1 ? "" : "s"}`} icon={<Users className="h-4 w-4" />} />
                  <UploadMetaItem label="Upload Timestamp" value={uploadedAt ? uploadedAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "Uploaded just now"} icon={<Clock3 className="h-4 w-4" />} />
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Button onClick={proceedToDashboard} className="sm:w-auto" disabled={!rows.length || missingColumns.length > 0}>View Compliance Dashboard</Button>
                  <Button variant="outline" onClick={resetUpload} className="sm:w-auto">
                    <RotateCcw className="h-4 w-4" />
                    Upload Another File
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {(isParsing || progress > 0) && uploadState === "empty" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-5">
                <Progress value={progress} />
                <p className="mt-2 text-xs text-muted-foreground">{isParsing ? "Checking required columns and statutory payroll rules..." : "Validation complete"}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-cedur-700" />
            Validation Status
          </CardTitle>
          <CardDescription>Compliance scan progress for the selected payroll file.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {[
            ["EPF Scan", ["EPF"]],
            ["EPS Scan", ["EPS"]],
            ["ESI Scan", ["ESI"]],
            ["PT & HRA Scan", ["Professional Tax", "HRA", "Tax Regime"]]
          ].map(([label, categories]) => {
            const status = getScanStatus(categories as string[], result.issues, uploadState, isParsing);
            return <ValidationStatusItem key={String(label)} label={String(label)} status={status} />;
          })}
        </CardContent>
      </Card>
    </div>
  );
}

type ScanStatus = "Pending" | "Processing" | "Passed" | "Warning" | "Failed";

function getScanStatus(categories: string[], issues: ReturnType<typeof validatePayroll>["issues"], uploadState: "empty" | "uploaded", isParsing: boolean): ScanStatus {
  if (isParsing) return "Processing";
  if (uploadState === "empty") return "Pending";
  const scanIssues = issues.filter((issue) => categories.includes(issue.category));
  if (scanIssues.some((issue) => issue.severity === "Critical")) return "Failed";
  if (scanIssues.some((issue) => issue.severity === "Warning")) return "Warning";
  return "Passed";
}

function UploadMetaItem({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-emerald-100 bg-white/80 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{label}</p>
      <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-foreground">
        {icon ? <span className="text-emerald-700">{icon}</span> : null}
        <span className="min-w-0 truncate">{value}</span>
      </div>
    </div>
  );
}

function ValidationStatusItem({ label, status }: { label: string; status: ScanStatus }) {
  const styles: Record<ScanStatus, { wrapper: string; icon: string; badge: "default" | "success" | "warning" | "destructive" | "outline" }> = {
    Pending: { wrapper: "bg-muted/50 text-muted-foreground", icon: "text-muted-foreground", badge: "outline" },
    Processing: { wrapper: "bg-blue-50 text-blue-800", icon: "text-blue-700", badge: "default" },
    Passed: { wrapper: "bg-emerald-50 text-emerald-900", icon: "text-emerald-700", badge: "success" },
    Warning: { wrapper: "bg-amber-50 text-amber-900", icon: "text-amber-700", badge: "warning" },
    Failed: { wrapper: "bg-red-50 text-red-900", icon: "text-red-700", badge: "destructive" }
  };

  const Icon = status === "Processing" ? Loader2 : status === "Failed" || status === "Warning" ? AlertTriangle : CheckCircle2;

  return (
    <div className={cn("flex items-center justify-between rounded-xl border border-border/60 p-4", styles[status].wrapper)}>
      <div className="flex items-center gap-3">
        <Icon className={cn("h-5 w-5", styles[status].icon, status === "Processing" && "animate-spin")} />
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <Badge variant={styles[status].badge}>{status}</Badge>
    </div>
  );
}

export function ManualEntryWorkflow() {
  const router = useRouter();
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(sampleCompanyInfo);
  const [manualRows, setManualRows] = useState<PayrollRow[]>([blankEmployee(sampleCompanyInfo.state)]);
  const { ruleMap, ptRules } = useComplianceRules();
  const result = useMemo(() => validatePayroll(manualRows, { payrollMonth: companyInfo.payrollMonth, rules: ruleMap, ptRules }), [manualRows, companyInfo.payrollMonth, ruleMap, ptRules]);

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
