import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  buildPackageSchedule,
  getAvailablePackageSlots,
} from "@/lib/availability";

type Payload = {
  service_id?: string;
  professional_id?: string;
  services?: string[] | string;
  professionals?: string[] | string;
  client_name?: string;
  client_phone?: string;
  client_email?: string | null;
  date?: string;
  time?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json()) as Payload;

  const normalizeList = (value?: string[] | string) => {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.map((item) => item.trim()).filter(Boolean);
    }
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const serviceIds = payload.services?.length
    ? normalizeList(payload.services)
    : payload.service_id
      ? [payload.service_id.trim()]
      : [];
  const professionalIds = payload.professionals?.length
    ? normalizeList(payload.professionals)
    : payload.professional_id
      ? [payload.professional_id.trim()]
      : [];

  const clientName = payload.client_name?.trim();
  const clientPhone = payload.client_phone?.trim();
  const clientEmail = payload.client_email?.trim() || null;
  const dateKey = payload.date?.trim();
  const time = payload.time?.trim();

  if (
    serviceIds.length === 0 ||
    professionalIds.length === 0 ||
    !clientName ||
    !clientPhone ||
    !dateKey ||
    !time
  ) {
    return NextResponse.json(
      { error: "Dados obrigatorios ausentes." },
      { status: 400 },
    );
  }

  if (serviceIds.length !== professionalIds.length) {
    return NextResponse.json(
      { error: "Dados obrigatorios ausentes." },
      { status: 400 },
    );
  }

  const { data: mappings, error: mappingError } = await supabase
    .from("service_professionals")
    .select("service_id,professional_id")
    .in("service_id", serviceIds)
    .in("professional_id", professionalIds);

  if (mappingError) {
    return NextResponse.json(
      { error: "Erro ao validar profissional." },
      { status: 500 },
    );
  }

  const mappingSet = new Set(
    (mappings ?? []).map(
      (item) => `${item.service_id}|${item.professional_id}`,
    ),
  );
  const invalidPair = serviceIds.find(
    (serviceId, index) =>
      !mappingSet.has(`${serviceId}|${professionalIds[index]}`),
  );

  if (invalidPair) {
    return NextResponse.json(
      { error: "Profissional nao atende esse servico." },
      { status: 400 },
    );
  }

  const { data: services } = await supabase
    .from("services")
    .select("id,duration_minutes")
    .in("id", serviceIds);

  const serviceMap = new Map(
    (services ?? []).map((service) => [
      service.id,
      service.duration_minutes ?? 0,
    ]),
  );
  const items = serviceIds.map((serviceId, index) => ({
    service_id: serviceId,
    professional_id: professionalIds[index],
    duration_minutes: serviceMap.get(serviceId) ?? 0,
  }));

  if (items.some((item) => item.duration_minutes <= 0)) {
    return NextResponse.json(
      { error: "Duracao do servico nao definida." },
      { status: 400 },
    );
  }

  const availableSlots = await getAvailablePackageSlots({
    dateKey,
    items,
  });

  if (!availableSlots.includes(time)) {
    return NextResponse.json(
      { error: "Horario indisponivel." },
      { status: 409 },
    );
  }

  const schedule = buildPackageSchedule({
    dateKey,
    startTime: time,
    items,
  });

  if (!schedule.startsAt || !schedule.endsAt) {
    return NextResponse.json(
      { error: "Horario indisponivel." },
      { status: 409 },
    );
  }

  const { data: inserted, error: insertError } = await supabase
    .from("appointments")
    .insert({
      service_id: serviceIds[0] ?? null,
      professional_id: professionalIds[0] ?? null,
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      starts_at: schedule.startsAt.toISOString(),
      ends_at: schedule.endsAt.toISOString(),
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

  const appointmentItems = schedule.steps.map((step) => ({
    appointment_id: inserted.id,
    service_id: step.service_id,
    professional_id: step.professional_id,
    starts_at: step.starts_at.toISOString(),
    ends_at: step.ends_at.toISOString(),
    order_index: step.order_index,
    duration_minutes_snapshot: step.duration_minutes,
  }));

  const { error: itemsError } = await supabase
    .from("appointment_services")
    .insert(appointmentItems);

  if (itemsError) {
    return NextResponse.json(
      { error: "Erro ao salvar itens do agendamento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: inserted.id });
}
