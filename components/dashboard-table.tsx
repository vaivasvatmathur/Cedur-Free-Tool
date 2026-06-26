import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { EmployeeComplianceLog } from "@/types/payroll";

export function DashboardTable({ logs }: { logs: EmployeeComplianceLog[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Employee</TableHead>
          <TableHead>Department</TableHead>
          <TableHead>Issue</TableHead>
          <TableHead>Severity</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.employeeId}>
            <TableCell>
              <div className="font-semibold">{log.employeeName}</div>
              <div className="text-xs text-muted-foreground">{log.employeeId}</div>
            </TableCell>
            <TableCell>{log.department}</TableCell>
            <TableCell>
              <div className="max-w-[420px] text-sm text-slate-700">
                {log.status === "Compliant" ? "Compliant" : log.issue}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">Gross: {formatCurrency(log.grossSalary)}</div>
            </TableCell>
            <TableCell>
              {(() => {
                const mappedSeverity = log.status === "Non-Compliant"
                  ? "Critical"
                  : log.status === "Review"
                  ? "Warning"
                  : "Compliant";

                const badgeClass = mappedSeverity === "Critical"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : mappedSeverity === "Warning"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-emerald-50 text-emerald-700 border-emerald-200";

                return (
                  <Badge variant="outline" className={`${badgeClass} font-semibold rounded-full border px-2.5 py-0.5`}>
                    {mappedSeverity}
                  </Badge>
                );
              })()}
            </TableCell>
            <TableCell>
              <Badge
                variant={
                  log.status === "Compliant" ? "success" : log.status === "Review" ? "warning" : "destructive"
                }
              >
                {log.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
