import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getBusinessHoursForDate, getLunchInterval } from "@/lib/availability";
import { toDateWithOffset } from "@/lib/datetime";

type Payload = {
  service_id?: string;
  professional_id?: string;
  client_name?: string;
  client_phone?: string;
  client_email?: string | null;
  date?: string;
  time?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Payload;

  const serviceId = payload.service_id?.trim();
  const professionalId = payload.professional_id?.trim();
  const clientName = payload.client_name?.trim();
  const clientPhone = payload.client_phone?.trim();
  const clientEmail = payload.client_email?.trim() || null;
  const dateKey = payload.date?.trim();
  const time = payload.time?.trim();

  if (!serviceId || !professionalId || !clientName || !clientPhone || !dateKey || !time) {
    return NextResponse.json(
      { error: "Dados obrigatorios ausentes." },
      { status: 400 },
    );
  }

  const { data: mappings, error: mappingError } = await supabase
    .from("service_professionals")
    .select("id")
    .eq("service_id", serviceId)
    .eq("professional_id", professionalId)
    .limit(1);

  if (mappingError) {
    return NextResponse.json(
      { error: "Erro ao validar profissional." },
      { status: 500 },
    );
  }

  if (!mappings || mappings.length === 0) {
    return NextResponse.json(
      { error: "Profissional nao atende esse servico." },
      { status: 400 },
    );
  }

  const { data: service } = await supabase
    .from("services")
    .select("duration_minutes")
    .eq("id", serviceId)
    .maybeSingle();

  const durationMinutes = service?.duration_minutes ?? 0;

  if (!durationMinutes) {
    return NextResponse.json(
      { error: "Duracao do servico nao definida." },
      { status: 400 },
    );
  }

  const startsAt = toDateWithOffset(dateKey, time);
  const endsAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  const { data: hoursData } = await supabase
    .from("business_hours")
    .select("*");
  const hours = getBusinessHoursForDate(new Date(`${dateKey}T00:00:00-03:00`), hoursData);

  if (!hours) {
    return NextResponse.json(
      { error: "Salao fechado neste dia." },
      { status: 400 },
    );
  }

  const openAt = toDateWithOffset(dateKey, hours.open);
  const closeAt = toDateWithOffset(dateKey, hours.close);

  if (startsAt < openAt || endsAt > closeAt) {
    return NextResponse.json(
      { error: "Horario fora do funcionamento do salao." },
      { status: 400 },
    );
  }

  const lunchInterval = getLunchInterval(dateKey);
  const overlapsLunch = startsAt < lunchInterval.end && endsAt > lunchInterval.start;

  if (overlapsLunch) {
    return NextResponse.json(
      { error: "Horário indisponível." },
      { status: 409 },
    );
  }

  const conflictRange = {
    start: startsAt.toISOString(),
    end: endsAt.toISOString(),
  };

  const { data: appointmentConflict } = await supabase
    .from("appointments")
    .select("id")
    .eq("professional_id", professionalId)
    .eq("status", "confirmed")
    .lt("starts_at", conflictRange.end)
    .gt("ends_at", conflictRange.start)
    .limit(1);

  if (appointmentConflict && appointmentConflict.length > 0) {
    return NextResponse.json(
      { error: "Horario ja ocupado." },
      { status: 409 },
    );
  }

  const { data: blockConflict } = await supabase
    .from("blocks")
    .select("id")
    .or(`professional_id.eq.${professionalId},professional_id.is.null`)
    .lt("starts_at", conflictRange.end)
    .gt("ends_at", conflictRange.start)
    .limit(1);

  if (blockConflict && blockConflict.length > 0) {
    return NextResponse.json(
      { error: "Horario bloqueado." },
      { status: 409 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("appointments")
    .insert({
      service_id: serviceId,
      professional_id: professionalId,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      starts_at: conflictRange.start,
      ends_at: conflictRange.end,
      status: "confirmed",
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    return NextResponse.json(
      { error: "Erro ao salvar agendamento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id });
}
