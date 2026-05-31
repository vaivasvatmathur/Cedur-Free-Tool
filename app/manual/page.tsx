import { Navbar } from "@/components/navbar";
import { ManualEntryWorkflow } from "@/components/upload-workflow";

export default function ManualEntryPage() {
  return (
    <main>
      <Navbar />
      <section className="page-shell py-8">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Manual Entry</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Enter employee payroll data manually</h1>
        </div>
        <ManualEntryWorkflow />
      </section>
    </main>
  );
}
