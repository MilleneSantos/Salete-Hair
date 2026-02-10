import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import {
  buildPackageSchedule,
  getAvailablePackageSlots,
} from "@/lib/availability";

const logDev = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.error(...args);
  }
};

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
    logDev("service_professionals error", mappingError);
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
    logDev("invalid service/professional pair", {
      serviceIds,
      professionalIds,
    });
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
    logDev("missing duration", { serviceIds, items });
    return NextResponse.json(
      { error: "Servico sem duracao configurada." },
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

  const appointmentItems = schedule.steps.map((step) => ({
    service_id: step.service_id,
    professional_id: step.professional_id,
    starts_at: step.starts_at.toISOString(),
    ends_at: step.ends_at.toISOString(),
    sort_order: step.order_index,
  }));

  const { data: rpcData, error: rpcError } = await supabase.rpc(
    "create_appointment_with_items",
    {
      client_name: clientName,
      client_phone: clientPhone,
      client_email: clientEmail,
      status: "confirmed",
      starts_at: schedule.startsAt.toISOString(),
      ends_at: schedule.endsAt.toISOString(),
      items: appointmentItems,
    },
  );

  if (rpcError) {
    logDev("create_appointment_with_items error", rpcError);
    return NextResponse.json(
      { error: "Erro ao salvar agendamento." },
      { status: 500 },
    );
  }

  const appointmentId =
    (rpcData as { appointment_id?: string } | null)?.appointment_id ??
    (rpcData as { id?: string } | null)?.id ??
    (Array.isArray(rpcData)
      ? (rpcData[0] as { appointment_id?: string; id?: string })?.appointment_id ??
        (rpcData[0] as { appointment_id?: string; id?: string })?.id
      : null);

  if (!appointmentId) {
    logDev("create_appointment_with_items missing id", rpcData);
    return NextResponse.json(
      { error: "Erro ao salvar agendamento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ id: appointmentId });
}
