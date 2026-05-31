import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PayslipsPlaceholderPage() {
  return (
    <main>
      <Navbar />
      <section className="page-shell grid min-h-[calc(100vh-64px)] place-items-center py-10">
        <Card className="max-w-2xl">
          <CardContent className="p-8 text-center">
            <div className="mx-auto mb-5 w-fit rounded-2xl bg-cedur-50 p-4 text-cedur-700">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-normal">Smart Payslip AI is coming next</h1>
            <p className="mt-3 text-muted-foreground">
              This placeholder keeps the compliance flow complete while the payslip generation module remains out of scope.
            </p>
            <Button className="mt-6" asChild>
              <Link href="/success">Back to Report</Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
