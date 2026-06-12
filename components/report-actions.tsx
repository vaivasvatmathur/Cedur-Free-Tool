"use client";

import { Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateCompliancePdf, downloadComplianceCsv } from "@/lib/report";
import { sampleCompanyInfo, samplePayrollRows } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";
import { useEffect, useMemo, useState } from "react";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";
import { useComplianceRules } from "@/hooks/use-compliance-rules";

export function ReportActions() {
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

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        size="lg"
        className="shadow-[0_14px_28px_rgba(131,94,245,0.24)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(131,94,245,0.3)]"
        onClick={() => generateCompliancePdf(result, companyInfo)}
      >
        <Download className="h-4 w-4" />
        Download Report
      </Button>
      <Button
        variant="outline"
        size="lg"
        className="transition duration-300 hover:-translate-y-0.5 hover:border-cedur-200 hover:bg-cedur-50"
        onClick={() => downloadComplianceCsv(result)}
      >
        <FileDown className="h-4 w-4" />
        Download CSV
      </Button>
    </div>
  );
}
