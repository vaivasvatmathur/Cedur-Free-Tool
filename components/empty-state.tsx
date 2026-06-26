"use client";

import Link from "next/link";
import { ClipboardList, FileSpreadsheet, Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center px-4 text-center">
      <div className="relative mb-6 flex h-28 w-28 items-center justify-center rounded-3xl bg-cedur-50 text-cedur-700 shadow-inner">
        <ClipboardList className="h-14 w-14" />
        <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-400 shadow-soft border">
          <FileSpreadsheet className="h-5 w-5" />
        </div>
      </div>
      
      <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
        No Payroll Data Uploaded Yet
      </h2>
      <p className="mt-3 max-w-md text-base leading-7 text-muted-foreground">
        Upload a payroll CSV/XLSX file or use Manual Entry to generate statutory compliance reports, risk alerts, and detailed audits.
      </p>

      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="rounded-full bg-[#835ef5] hover:bg-[#724ee6] px-8 text-base">
          <Link href="/upload" className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Upload Payroll
          </Link>
        </Button>
        <Button asChild size="lg" variant="outline" className="rounded-full px-8 text-base border-slate-300">
          <Link href="/manual" className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Manual Entry
          </Link>
        </Button>
      </div>
    </div>
  );
}
