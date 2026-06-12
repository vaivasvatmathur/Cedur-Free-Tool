import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";
import { defaultPTRules } from "@/lib/services/ruleService";

export const dynamic = "force-dynamic";

const ptRuleSchema = z.object({
  id: z.string().optional(),
  state: z.string().min(1),
  min_salary: z.number().min(0),
  max_salary: z.number().min(0).nullable(),
  pt_amount: z.number().min(0)
});

const payloadSchema = z.object({
  rules: z.array(ptRuleSchema).min(1)
});

export async function GET() {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({
      rules: defaultPTRules,
      message: "Supabase environment variables are not configured. Using default local PT rules."
    });
  }

  try {
    await seedDefaultPTRules();
    const { data, error } = await supabase.from("pt_rules").select("*").order("state").order("min_salary");
    if (error) throw error;
    return NextResponse.json({ rules: data?.length ? data : defaultPTRules });
  } catch {
    return NextResponse.json({
      rules: defaultPTRules,
      message: "PT rules table is unavailable. Run supabase/schema.sql to enable database-backed rules."
    });
  }
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid PT rule payload" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({
      rules: parsed.data.rules,
      message: "Supabase environment variables are not configured. Changes are cached in this browser only."
    });
  }

  try {
    await seedDefaultPTRules();
    const { data: previousRules } = await supabase.from("pt_rules").select("*").order("state").order("min_salary");
    const rows = parsed.data.rules.map(({ id: _id, ...rule }) => ({
      ...rule,
      updated_at: new Date().toISOString()
    }));

    const { error: deleteError } = await supabase.from("pt_rules").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (deleteError) throw deleteError;

    const { error: insertError } = await supabase.from("pt_rules").insert(rows);
    if (insertError) throw insertError;

    await supabase.from("rule_change_history").insert({
      rule_key: "PT_RULES",
      old_value: JSON.stringify(previousRules ?? []),
      new_value: JSON.stringify(rows)
    });

    const { data, error } = await supabase.from("pt_rules").select("*").order("state").order("min_salary");
    if (error) throw error;
    return NextResponse.json({ rules: data });
  } catch {
    return NextResponse.json({ error: "Unable to update PT rules. Confirm database schema is applied." }, { status: 500 });
  }
}

async function seedDefaultPTRules() {
  const supabase = getSupabaseServerClient();
  if (!supabase) return;
  const { count } = await supabase.from("pt_rules").select("id", { count: "exact", head: true });
  if (count === 0) {
    await supabase.from("pt_rules").insert(defaultPTRules);
  }
}
