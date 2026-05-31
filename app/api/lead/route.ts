import { NextResponse } from "next/server";
import { z } from "zod";
import { getSupabaseServerClient } from "@/lib/supabase";

const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);

const schema = z
  .object({
    email: z.preprocess(emptyToUndefined, z.string().email().optional()),
    phone: z.preprocess(emptyToUndefined, z.string().min(10).max(15).optional())
  })
  .refine((value) => Boolean(value.email || value.phone), {
    message: "Enter either your work email or phone number to get report"
  });

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "local" });
  }

  const { error } = await supabase.from("leads").insert({
    email: parsed.data.email ?? null,
    phone: parsed.data.phone ?? null
  });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
