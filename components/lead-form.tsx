"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { AlertCircle, CheckCircle2, Loader2, Mail, Phone, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { sampleCompanyInfo, samplePayrollRows } from "@/lib/sample-data";
import type { CompanyInfo, PayrollRow } from "@/types/payroll";

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const leadSchema = z
  .object({
    email: z.preprocess(emptyToUndefined, z.string().email("Enter a valid work email")),
    phone: z.preprocess(
      emptyToUndefined,
      z.string().min(10, "Enter a valid phone number").max(15, "Enter a valid phone number").optional()
    ),
    sendBoth: z.boolean().optional()
  })
  .refine((value) => !value.sendBoth || Boolean(value.phone), {
    message: "Enter a phone number to send report to both",
    path: ["sendBoth"]
  });

type LeadValues = z.infer<typeof leadSchema>;
type DeliveryState = "idle" | "success" | "error";

export function LeadForm() {
  const router = useRouter();
  const [notice, setNotice] = useState("");
  const [deliveryState, setDeliveryState] = useState<DeliveryState>("idle");
  const form = useForm<LeadValues>({
    resolver: zodResolver(leadSchema),
    defaultValues: { email: "", phone: "", sendBoth: false }
  });

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4200);
  }

  async function onSubmit(values: LeadValues) {
    setDeliveryState("idle");

    try {
      const savedRows = window.sessionStorage.getItem("cedur-payroll-rows");
      const savedCompany = window.sessionStorage.getItem("cedur-company-info");
      const rows = savedRows ? (JSON.parse(savedRows) as PayrollRow[]) : samplePayrollRows;
      const companyInfo = savedCompany ? (JSON.parse(savedCompany) as CompanyInfo) : sampleCompanyInfo;

      const response = await fetch("/api/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: values.email,
          phone: values.phone || undefined,
          sendBoth: values.sendBoth,
          companyInfo,
          rows
        })
      });

      const payload = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to send the report right now.");
      }

      window.sessionStorage.setItem("cedur-report-contact", JSON.stringify(values));
      setDeliveryState("success");
      window.setTimeout(() => router.push("/success"), 900);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to send the report right now.";
      setDeliveryState("error");
      showNotice(message);
    }
  }

  const isSubmitting = form.formState.isSubmitting;

  return (
    <>
      {notice && (
        <div className="fixed right-4 top-24 z-50 flex w-[min(360px,calc(100vw-2rem))] items-start gap-3 rounded-2xl border border-amber-200 bg-white p-4 shadow-[0_20px_55px_rgba(42,31,83,0.18)]">
          <div className="rounded-full bg-amber-50 p-2 text-amber-600">
            <AlertCircle className="h-5 w-5" />
          </div>
          <p className="flex-1 text-sm font-semibold leading-6 text-slate-800">{notice}</p>
          <button type="button" aria-label="Dismiss notification" onClick={() => setNotice("")} className="rounded-full p-1 text-slate-400 hover:bg-muted hover:text-slate-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <form
        className="space-y-5"
        onSubmit={form.handleSubmit(onSubmit, () => {
          const email = form.getValues("email");
          const phone = form.getValues("phone");
          const sendBoth = form.getValues("sendBoth");
          if (!email) {
            showNotice("Enter a valid work email to receive your report");
          } else if (sendBoth && !phone) {
            showNotice("Enter a phone number to send report to both");
          }
        })}
      >
        {deliveryState === "success" && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-5 w-5" />
            <p className="text-sm font-semibold leading-6">Report sent. Taking you to the download page...</p>
          </div>
        )}
        {deliveryState === "error" && (
          <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5" />
            <p className="text-sm font-semibold leading-6">We could not send the report. Please try again.</p>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Work Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input id="email" className="pl-10" placeholder="name@company.com" disabled={isSubmitting} {...form.register("email")} />
          </div>
          {form.formState.errors.email && <p className="text-sm text-red-600">{form.formState.errors.email.message}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="rounded-full border bg-white px-3 py-1 text-xs font-bold text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-border" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
            <Input id="phone" className="pl-10" placeholder="+91 98765 43210" disabled={isSubmitting} {...form.register("phone")} />
          </div>
          {form.formState.errors.phone && <p className="text-sm text-red-600">{form.formState.errors.phone.message}</p>}
          {form.formState.errors.sendBoth && <p className="text-sm text-red-600">{form.formState.errors.sendBoth.message}</p>}
        </div>
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-white p-4 shadow-sm transition hover:bg-muted/30">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-input accent-[#835ef5]"
            disabled={isSubmitting}
            {...form.register("sendBoth")}
          />
          <span className="flex-1">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <Send className="h-4 w-4 text-[#835ef5]" />
              Send report to both (Email and WhatsApp)
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Select this if you want the report delivered to both contact channels.
            </span>
          </span>
        </label>
        <Button className="w-full" size="lg" disabled={isSubmitting || deliveryState === "success"}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? "Generating and sending..." : deliveryState === "success" ? "Report Sent" : "Send My Free Report"}
        </Button>
      </form>
    </>
  );
}
