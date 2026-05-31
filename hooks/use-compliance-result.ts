"use client";

import { useMemo } from "react";
import { validatePayroll } from "@/lib/validation";
import type { PayrollRow } from "@/types/payroll";

export function useComplianceResult(rows: PayrollRow[]) {
  return useMemo(() => validatePayroll(rows), [rows]);
}
