import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({
        ok: true,
        mode: "local",
        message: "Supabase environment variables are not configured. Operating in simulated local mode."
      });
    }

    // 1. Temporarily upload to bucket for processing
    const bytes = await file.arrayBuffer();
    const storagePath = `${Date.now()}-${file.name}`;
    
    const { error: uploadError } = await supabase.storage.from("payroll-uploads").upload(storagePath, bytes, {
      contentType: file.type || "application/octet-stream",
      upsert: false
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    // 2. Insert metadata record in Supabase schema table 'uploads'
    const { error: metadataError } = await supabase.from("uploads").insert({
      file_name: file.name,
      processed: true
    });

    if (metadataError) {
      // Clean up the storage file even if database log fails
      await supabase.storage.from("payroll-uploads").remove([storagePath]);
      return NextResponse.json({ error: metadataError.message }, { status: 500 });
    }

    // 3. Immediately delete from storage to ensure we DO NOT permanently store payroll files
    const { error: deleteError } = await supabase.storage.from("payroll-uploads").remove([storagePath]);
    
    if (deleteError) {
      console.warn("Temporary storage deletion warning:", deleteError.message);
    }

    return NextResponse.json({ ok: true, file_name: file.name, processed: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "File upload processing failed" }, { status: 500 });
  }
}
