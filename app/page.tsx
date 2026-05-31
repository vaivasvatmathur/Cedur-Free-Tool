import Link from "next/link";
import { ArrowRight, BadgeCheck, FileSpreadsheet, Keyboard, LockKeyhole, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComplianceRing } from "@/components/compliance-ring";
import { MonthlyComplianceChart } from "@/components/insights-chart";
import { samplePayrollRows } from "@/lib/sample-data";
import { validatePayroll } from "@/lib/validation";

export default function LandingPage() {
  const result = validatePayroll(samplePayrollRows);

  return (
    <main>
      <Navbar />
      <section className="home-hero-gradient border-b">
        <div className="page-shell grid min-h-[680px] gap-10 py-12 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-16">
          <div>
            <Badge className="mb-5">Free payroll compliance checker</Badge>
            <h1 className="font-gilroy-extrabold max-w-3xl text-4xl tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
              Instant Payroll <span className="text-[#2991ec]">Compliance Check</span> for Indian Businesses
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
              Validate EPF, EPS, ESI, Professional Tax, HRA, and tax-regime rules in seconds. Ensure payroll data meets statutory requirements before processing. No signup required.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/upload">
                  <UploadCloud className="h-5 w-5" />
                  Upload Payroll Sheet
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/manual">
                  <Keyboard className="h-5 w-5" />
                  Manual Entry
                </Link>
              </Button>
            </div>
            <div className="mt-3">
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard">
                  View Sample Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              {[
                ["Free Tool", BadgeCheck],
                ["No Signup Required", Sparkles],
                ["Secure Processing", LockKeyhole]
              ].map(([label, Icon]) => (
                <div key={String(label)} className="inline-flex items-center gap-2 rounded-full border bg-white px-4 py-2 text-sm font-semibold shadow-sm">
                  <Icon className="h-4 w-4 text-cedur-700" />
                  {label as string}
                </div>
              ))}
            </div>
          </div>
          <div className="grid gap-5">
            <Card className="overflow-hidden">
              <CardHeader className="flex-row items-center justify-between space-y-0 bg-white">
                <div>
                  <CardTitle>Compliance Snapshot</CardTitle>
                  <CardDescription>Live rule engine preview</CardDescription>
                </div>
                <Badge variant="success">Active</Badge>
              </CardHeader>
              <CardContent className="grid gap-6 p-6 sm:grid-cols-[0.7fr_1fr]">
                <div className="grid place-items-center">
                  <ComplianceRing score={result.score} />
                </div>
                <div className="grid gap-3">
                  {[
                    ["EPF issues", result.issues.filter((issue) => issue.category === "EPF").length],
                    ["EPS issues", result.issues.filter((issue) => issue.category === "EPS").length],
                    ["ESI issues", result.issues.filter((issue) => issue.category === "ESI").length],
                    ["PT/HRA alerts", result.issues.filter((issue) => ["Professional Tax", "HRA", "Tax Regime"].includes(issue.category)).length]
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-2xl border bg-muted/40 p-4">
                      <p className="text-sm text-muted-foreground">{label}</p>
                      <p className="mt-1 text-2xl font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Compliance Charts</CardTitle>
                <CardDescription>Monthly health across statutory checks</CardDescription>
              </CardHeader>
              <CardContent>
                <MonthlyComplianceChart />
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="page-shell py-14">
        <div className="grid gap-5 md:grid-cols-3">
          {[
            ["EPF, EPS, and ESI validation", "Detect missing or incorrect statutory contributions before payroll is processed.", ShieldCheck],
            ["PT, HRA, and tax-regime checks", "Flag state PT mismatches and HRA treatment under Old vs New regime.", FileSpreadsheet],
            ["AI-style recommendations", "Rule-based recommendations convert findings into next steps.", Sparkles]
          ].map(([title, copy, Icon]) => (
            <Card key={String(title)}>
              <CardHeader>
                <div className="mb-2 w-fit rounded-2xl bg-cedur-50 p-3 text-cedur-700">
                  <Icon className="h-5 w-5" />
                </div>
                <CardTitle>{title as string}</CardTitle>
                <CardDescription>{copy as string}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
