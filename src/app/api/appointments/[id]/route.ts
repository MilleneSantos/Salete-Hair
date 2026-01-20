import { NextResponse, type NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id: appointmentId } = await context.params;

  if (!appointmentId) {
    return NextResponse.json({ error: "Id ausente." }, { status: 400 });
  }

  const payload = (await request.json().catch(() => null)) as {
    status?: string;
  } | null;

  const status = payload?.status ?? "cancelled";

  const { error } = await supabase
    .from("appointments")
    .update({ status })
    .eq("id", appointmentId);

  if (error) {
    return NextResponse.json(
      { error: "Erro ao atualizar agendamento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
