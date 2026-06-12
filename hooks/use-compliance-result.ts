"use client";

import { useMemo } from "react";
import { validatePayroll } from "@/lib/validation";
import type { PayrollRow } from "@/types/payroll";
import { useComplianceRules } from "./use-compliance-rules";

export function useComplianceResult(rows: PayrollRow[]) {
  const { ruleMap, ptRules } = useComplianceRules();
  return useMemo(() => validatePayroll(rows, { rules: ruleMap, ptRules }), [rows, ruleMap, ptRules]);
}
