import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";
import { defaultComplianceRules } from "@/lib/services/ruleService";
import type { ComplianceRule } from "@/types/payroll";

export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  rule_key: z.string().min(1),
  rule_value: z.string().min(1),
  description: z.string().optional(),
  effective_from: z.string().optional()
});

const payloadSchema = z.object({
  rules: z.array(ruleSchema).min(1)
});

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({
      rules: defaultComplianceRules,
      message: "Supabase environment variables are not configured. Using default local rules."
    });
  }

  try {
    await seedDefaultRules();
    const { data, error } = await supabase.from("compliance_rules").select("*").order("rule_key");
    if (error) throw error;
    return NextResponse.json({ rules: data?.length ? data : defaultComplianceRules });
  } catch {
    return NextResponse.json({
      rules: defaultComplianceRules,
      message: "Compliance rules table is unavailable. Run supabase/schema.sql to enable database-backed rules."
    });
  }
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid rule payload" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    const merged = mergeRules(
      defaultComplianceRules,
      parsed.data.rules.map((rule) => ({
        ...rule,
        description: rule.description ?? defaultComplianceRules.find((item) => item.rule_key === rule.rule_key)?.description ?? ""
      }))
    );
    return NextResponse.json({
      rules: merged,
      message: "Supabase environment variables are not configured. Changes are cached in this browser only."
    });
  }

  try {
    await seedDefaultRules();
    const updates = parsed.data.rules.map((rule) => ({
      rule_key: rule.rule_key,
      rule_value: rule.rule_value,
      description: rule.description ?? defaultComplianceRules.find((item) => item.rule_key === rule.rule_key)?.description ?? "",
      effective_from: rule.effective_from ?? new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString()
    }));
    const keys = updates.map((rule) => rule.rule_key);
    const { data: existing } = await supabase.from("compliance_rules").select("rule_key, rule_value").in("rule_key", keys);
    const oldValues = new Map((existing ?? []).map((rule) => [rule.rule_key, rule.rule_value]));

    const historyRows = updates
      .filter((rule) => oldValues.get(rule.rule_key) !== undefined && oldValues.get(rule.rule_key) !== rule.rule_value)
      .map((rule) => ({
        rule_key: rule.rule_key,
        old_value: oldValues.get(rule.rule_key) ?? null,
        new_value: rule.rule_value
      }));

    const { error: upsertError } = await supabase.from("compliance_rules").upsert(updates, { onConflict: "rule_key" });
    if (upsertError) throw upsertError;

    if (historyRows.length) {
      const { error: historyError } = await supabase.from("rule_change_history").insert(historyRows);
      if (historyError) throw historyError;
    }

    const { data, error } = await supabase.from("compliance_rules").select("*").order("rule_key");
    if (error) throw error;
    return NextResponse.json({ rules: data });
  } catch {
    return NextResponse.json({ error: "Unable to update compliance rules. Confirm database schema is applied." }, { status: 500 });
  }
}

async function seedDefaultRules() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  await supabase.from("compliance_rules").upsert(defaultComplianceRules, { onConflict: "rule_key", ignoreDuplicates: true });
}

function mergeRules(currentRules: ComplianceRule[], updates: ComplianceRule[]) {
  const byKey = new Map(currentRules.map((rule) => [rule.rule_key, rule]));
  for (const update of updates) {
    byKey.set(update.rule_key, { ...byKey.get(update.rule_key), ...update });
  }
  return Array.from(byKey.values());
}
