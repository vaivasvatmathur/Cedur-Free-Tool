import { Download, IndianRupee, LineChart, PieChart, ShieldCheck, TrendingUp } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MetricCard } from "@/components/metric-card";
import { MonthlyComplianceChart, PayrollTrendChart } from "@/components/insights-chart";
import { ReportActions } from "@/components/report-actions";

export default function ReportsPage() {
  return (
    <main>
      <Navbar />
      <section className="page-shell py-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Reports & Insights</p>
            <h1 className="mt-2 text-3xl font-bold tracking-normal">Payroll compliance analytics</h1>
            <p className="mt-2 text-muted-foreground">Monthly reports, contribution stats, and AI insight cards.</p>
          </div>
          <ReportActions />
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Payroll Summary" value="Rs. 2.34L" detail="Gross payroll this cycle" icon={IndianRupee} tone="purple" />
          <MetricCard label="EPF/EPS Contributions" value="Rs. 17.2K" detail="Employee + employer split" icon={ShieldCheck} tone="green" />
          <MetricCard label="Compliance Trend" value="+7%" detail="Improved over last cycle" icon={TrendingUp} tone="blue" />
          <MetricCard label="Open Alerts" value="11" detail="EPF, EPS, ESI, PT, HRA" icon={PieChart} tone="amber" />
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Monthly Report Chart</CardTitle>
                <CardDescription>Compliance, warnings, and critical issues by month.</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Download className="h-4 w-4" /> Export PDF</Button>
            </CardHeader>
            <CardContent>
              <MonthlyComplianceChart />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Compliance Analytics</CardTitle>
              <CardDescription>Score movement across payroll runs.</CardDescription>
            </CardHeader>
            <CardContent>
              <PayrollTrendChart />
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            ["EPF contribution variance dropped after May payroll corrections.", "High confidence"],
            ["ESI threshold review is recommended for support and field operations teams.", "Medium priority"],
            ["Salary structure anomalies are concentrated in new joiner records.", "Review needed"]
          ].map(([copy, badge]) => (
            <Card key={copy}>
              <CardHeader>
                <div className="mb-2 w-fit rounded-2xl bg-cedur-50 p-3 text-cedur-700">
                  <LineChart className="h-5 w-5" />
                </div>
                <Badge>{badge}</Badge>
                <CardTitle className="text-base leading-6">{copy}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
