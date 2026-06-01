import Link from "next/link";
import { ArrowRight, BadgeCheck, FileSpreadsheet, Keyboard, LockKeyhole, ShieldCheck, Sparkles, UploadCloud } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ComplianceRing } from "@/components/compliance-ring";
import { MonthlyComplianceChart } from "@/components/insights-chart";
export default function LandingPage() {
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
            {/* Empty-State Message & Demo Showcase Banner */}
            <Card className="border-cedur-200 bg-gradient-to-br from-cedur-50/50 to-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="border-cedur-300 bg-cedur-50 text-cedur-700">
                    Demo Preview
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    Example Compliance Analytics
                  </span>
                </div>
                <h2 className="mt-4 text-xl font-bold text-slate-900 sm:text-2xl">
                  See How Your Compliance Report Will Look
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Upload payroll data to generate automated statutory compliance reports, identify payroll risks, and receive detailed EPF, ESI, PT, and HRA validation insights. The charts below are illustrative examples only.
                </p>
                <div className="mt-4 rounded-xl bg-white p-3 border text-xs text-muted-foreground flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cedur-500 shrink-0" />
                  <span>Your actual insights will appear here after payroll processing.</span>
                </div>
              </CardContent>
            </Card>

            {/* Illustrative Dashboard Preview */}
            <Card className="overflow-hidden border-slate-200 shadow-soft">
              <CardHeader className="flex-row items-center justify-between bg-slate-50/60 border-b py-4">
                <div>
                  <CardTitle className="text-base font-bold">Sample Compliance Report Preview</CardTitle>
                  <CardDescription className="text-xs">Visualizing statutory payroll insights</CardDescription>
                </div>
                <Badge variant="outline" className="bg-slate-200/70 border-slate-300 text-slate-700 pointer-events-none">
                  Sample Data
                </Badge>
              </CardHeader>
              <CardContent className="grid gap-6 p-6 sm:grid-cols-[0.8fr_1.2fr]">
                <div className="flex flex-col items-center justify-center border-b pb-6 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6">
                  <ComplianceRing score={95} size="sm" />
                  <p className="mt-3 text-sm font-semibold text-slate-800">Example Score Card</p>
                  <p className="text-center text-xs text-muted-foreground mt-1 max-w-[150px]">
                    Ideal benchmark targets 100% compliant filings
                  </p>
                </div>
                
                <div className="grid gap-2">
                  {[
                    ["EPF / EPS Analysis", "Checked Basic + DA slabs and voluntary caps", "4 Rules Checked"],
                    ["ESI Eligibility Check", "Flagged monthly gross salary limits", "1 Risk Alert"],
                    ["Professional Tax", "State slab audit for MH, KA, TN, and DL", "Validated"],
                    ["HRA Tax Exemptions", "Calculated 3 statutory exemption routes", "Old Regime Only"]
                  ].map(([label, desc, status]) => (
                    <div key={label} className="rounded-xl border bg-muted/20 p-3 hover:bg-muted/40 transition">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-800">{label}</p>
                        <span className="text-[10px] font-bold text-cedur-600 bg-cedur-50 border border-cedur-100 rounded-full px-2 py-0.5">
                          {status}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Illustrative Trend Chart Card */}
            <Card className="border-slate-200">
              <CardHeader className="py-4 border-b bg-slate-50/40">
                <CardTitle className="text-sm font-bold flex items-center justify-between">
                  <span>Sample Compliance Trend</span>
                  <span className="text-xs font-normal text-muted-foreground">Monthly Stat Check (Sample)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
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
