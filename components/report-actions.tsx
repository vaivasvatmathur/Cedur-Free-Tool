"use client";

import { Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateCompliancePdf, downloadComplianceCsv } from "@/lib/report";
import { sampleCompanyInfo, samplePayrollRows } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";
import { useEffect, useMemo, useState } from "react";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";

export function ReportActions() {
  const [rows, setRows] = useState<PayrollRow[]>(samplePayrollRows);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(sampleCompanyInfo);

  useEffect(() => {
    const savedRows = window.sessionStorage.getItem("cedur-payroll-rows");
    const savedCompany = window.sessionStorage.getItem("cedur-company-info");
    if (savedRows) setRows(JSON.parse(savedRows) as PayrollRow[]);
    if (savedCompany) setCompanyInfo(JSON.parse(savedCompany) as CompanyInfo);
  }, []);

  const result = useMemo(() => validatePayroll(rows, { payrollMonth: companyInfo.payrollMonth }), [rows, companyInfo.payrollMonth]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button onClick={() => generateCompliancePdf(result)}>
        <Download className="h-4 w-4" />
        Download Report Now
      </Button>
      <Button variant="outline" onClick={() => downloadComplianceCsv(result)}>
        <FileDown className="h-4 w-4" />
        Download CSV
      </Button>
    </div>
  );
}
