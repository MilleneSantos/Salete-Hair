import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { toDateWithOffset } from "@/lib/datetime";

type Payload = {
  professional_id?: string | null;
  date?: string;
  start_time?: string;
  end_time?: string;
  reason?: string | null;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Payload;
  const professionalId = payload.professional_id?.trim() || null;
  const dateKey = payload.date?.trim();
  const startTime = payload.start_time?.trim();
  const endTime = payload.end_time?.trim();
  const reason = payload.reason?.trim() || null;

  if (!dateKey || !startTime || !endTime) {
    return NextResponse.json(
      { error: "Data e horarios sao obrigatorios." },
      { status: 400 },
    );
  }

  const startsAt = toDateWithOffset(dateKey, startTime);
  const endsAt = toDateWithOffset(dateKey, endTime);

  if (endsAt <= startsAt) {
    return NextResponse.json(
      { error: "Horario final deve ser maior que o inicial." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("blocks").insert({
    professional_id: professionalId,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt.toISOString(),
    reason,
  });

  if (error) {
    return NextResponse.json(
      { error: "Erro ao criar bloqueio." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
