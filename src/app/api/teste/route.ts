import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,duration_minutes")
    .limit(5);

  return NextResponse.json({ ok: !error, error: error?.message ?? null, data });
}