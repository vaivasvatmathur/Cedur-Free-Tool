import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";

const schema = z.object({
  health_score: z.number().int(),
  critical_issues: z.number().int(),
  warnings: z.number().int(),
  report_data: z.any()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ 
        ok: true, 
        mode: "local", 
        message: "Supabase environment variables are not configured. Operating in simulated local mode." 
      });
    }

    const { error } = await supabase.from("reports").insert({
      health_score: parsed.data.health_score,
      critical_issues: parsed.data.critical_issues,
      warnings: parsed.data.warnings,
      report_data: parsed.data.report_data
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to log report metadata" }, { status: 500 });
  }
}
