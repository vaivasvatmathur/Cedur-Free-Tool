import { samplePayrollRows } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";
import type { PayrollRow } from "@/types/payroll";

export function getComplianceResult(rows: PayrollRow[] = samplePayrollRows) {
  return validatePayroll(rows);
}
