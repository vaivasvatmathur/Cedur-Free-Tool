import { Navbar } from "@/components/navbar";
import { ComplianceRulesSettings } from "@/components/compliance-rules-settings";

export default function ComplianceRulesSettingsPage() {
  return (
    <main>
      <Navbar />
      <section className="page-shell py-8">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Internal Settings</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Compliance rule management</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Update statutory payroll rule values without changing code. Saved values apply to future validations, reports, and exports.
          </p>
        </div>
        <ComplianceRulesSettings />
      </section>
    </main>
  );
}
