import { Navbar } from "@/components/navbar";
import { UploadWorkflow } from "@/components/upload-workflow";

export default function UploadPage() {
  return (
    <main>
      <Navbar />
      <section className="page-shell py-8">
        <div className="mb-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cedur-700">Payroll Upload</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal">Validate payroll compliance before processing</h1>
        </div>
        <UploadWorkflow />
      </section>
    </main>
  );
}
