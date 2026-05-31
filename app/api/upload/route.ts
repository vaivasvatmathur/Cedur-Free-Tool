import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "File is required" }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return NextResponse.json({ ok: true, mode: "local", message: "Supabase environment variables are not configured." });
  }

  const bytes = await file.arrayBuffer();
  const storagePath = `payroll-uploads/${Date.now()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("payroll-uploads").upload(storagePath, bytes, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { error: metadataError } = await supabase.from("uploads").insert({
    file_name: file.name,
    file_type: file.type,
    file_size: file.size,
    storage_path: storagePath
  });

  if (metadataError) {
    return NextResponse.json({ error: metadataError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, storagePath });
}
