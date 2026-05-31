"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { normalizeHeader, validateRequiredColumns } from "@/lib/validation";
import type { PayrollRow, TaxRegime } from "@/types/payroll";

const headerMap: Record<string, keyof PayrollRow> = {
  employee_id: "employeeId",
  employee_name: "employeeName",
  state: "state",
  basic_salary: "basicSalary",
  basic: "basicSalary",
  dearness_allowance: "dearnessAllowance",
  da: "dearnessAllowance",
  gross_salary: "grossSalary",
  gross: "grossSalary",
  hra_received: "hraReceived",
  annual_rent_paid: "annualRentPaid",
  metro_city: "metroCity",
  employee_epf_deduction: "employeeEpf",
  employee_epf: "employeeEpf",
  employer_epf_contribution: "employerEpf",
  employer_epf: "employerEpf",
  employer_eps_contribution: "employerEps",
  employer_eps: "employerEps",
  employee_esi_deduction: "employeeEsi",
  employee_esi: "employeeEsi",
  professional_tax_deduction: "professionalTax",
  professional_tax: "professionalTax",
  tax_regime: "taxRegime",
  department: "department"
};

export type ParsedPayrollFile = {
  rows: PayrollRow[];
  missingColumns: string[];
};

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  return Number(String(value ?? "").replace(/,/g, "")) || 0;
}

function toBoolean(value: unknown) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return ["yes", "true", "y", "1", "metro"].includes(normalized);
}

function toTaxRegime(value: unknown): TaxRegime {
  return String(value ?? "").trim().toLowerCase() === "new" ? "New" : "Old";
}

function coerceRows(rows: Record<string, unknown>[]): PayrollRow[] {
  return rows
    .filter((row) => Object.values(row).some((value) => value !== null && value !== undefined && value !== ""))
    .map((raw, index) => {
      const mapped: Partial<Record<keyof PayrollRow, unknown>> = {};
      for (const [key, value] of Object.entries(raw)) {
        const payrollKey = headerMap[normalizeHeader(key)];
        if (payrollKey) mapped[payrollKey] = value;
      }
      return {
        employeeId: String(mapped.employeeId ?? `EMP-${index + 1}`),
        employeeName: String(mapped.employeeName ?? `Employee ${index + 1}`),
        department: String(mapped.department ?? "General"),
        state: String(mapped.state ?? ""),
        basicSalary: toNumber(mapped.basicSalary),
        dearnessAllowance: toNumber(mapped.dearnessAllowance),
        grossSalary: toNumber(mapped.grossSalary),
        hraReceived: toNumber(mapped.hraReceived),
        annualRentPaid: toNumber(mapped.annualRentPaid),
        metroCity: toBoolean(mapped.metroCity),
        employeeEpf: toNumber(mapped.employeeEpf),
        employerEpf: toNumber(mapped.employerEpf),
        employerEps: toNumber(mapped.employerEps),
        employeeEsi: toNumber(mapped.employeeEsi),
        professionalTax: toNumber(mapped.professionalTax),
        taxRegime: toTaxRegime(mapped.taxRegime)
      };
    });
}

export async function parsePayrollFile(file: File): Promise<ParsedPayrollFile> {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, unknown>>(text, { header: true, skipEmptyLines: true });
    const headers = parsed.meta.fields ?? [];
    const missingColumns = validateRequiredColumns(headers);
    return { rows: missingColumns.length ? [] : coerceRows(parsed.data), missingColumns };
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const headerRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown as unknown[][];
  const headers = (headerRows[0] ?? []).map(String);
  const missingColumns = validateRequiredColumns(headers);
  return { rows: missingColumns.length ? [] : coerceRows(rows), missingColumns };
}
