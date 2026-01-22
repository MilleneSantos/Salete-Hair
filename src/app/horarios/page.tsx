import { supabase } from "@/lib/supabase";
import {
  addDays,
  formatDateKey,
  formatDayLabel,
  formatLongDate,
} from "@/lib/datetime";
import { getAvailablePackageSlots, getBusinessHoursForDate } from "@/lib/availability";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

type SearchParams = Record<string, string | string[] | undefined>;

type ServiceRow = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedParams = await searchParams;
  const getParam = (params: SearchParams, key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const serviceParam = resolvedParams.service;
  const servicesParam = resolvedParams.services;
  const proParam = resolvedParams.pro;
  const prosParam = resolvedParams.pros;
  const serviceId = getParam(resolvedParams, "service");
  const servicesValue = getParam(resolvedParams, "services");
  const professionalId = getParam(resolvedParams, "pro");
  const prosValue = getParam(resolvedParams, "pros");
  const dayParam = getParam(resolvedParams, "day");
  const categoryParam = getParam(resolvedParams, "category");
  const toList = (value?: string | string[]) => {
    if (!value) {
      return [];
    }
    const raw = Array.isArray(value) ? value.join(",") : value;
    return raw
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  };
  const serviceIds = servicesValue
    ? toList(servicesValue)
    : serviceId
      ? [serviceId]
      : [];
  const professionalIds = prosValue
    ? toList(prosValue)
    : professionalId
      ? [professionalId]
      : [];

  if (serviceIds.length === 0 || professionalIds.length === 0) {
    const debugService = Array.isArray(serviceParam)
      ? serviceParam.join(",")
      : serviceParam ?? "undefined";
    const debugPro = Array.isArray(proParam)
      ? proParam.join(",")
      : proParam ?? "undefined";
    const debugServices = Array.isArray(servicesParam)
      ? servicesParam.join(",")
      : servicesParam ?? "undefined";
    const debugPros = Array.isArray(prosParam)
      ? prosParam.join(",")
      : prosParam ?? "undefined";

    return (
      <Screen>
        <Button href="/" variant="ghost">
          Voltar
        </Button>
        <p className="text-sm text-white/70">Parametros incompletos.</p>
        <p className="text-xs text-white/50">
          service={debugService} / services={debugServices} / pro={debugPro} / pros={debugPros}
        </p>
      </Screen>
    );
  }

  if (serviceIds.length !== professionalIds.length) {
    return (
      <Screen>
        <Button href="/" variant="ghost">
          Voltar
        </Button>
        <p className="text-sm text-white/70">Parametros incompletos.</p>
        <p className="text-xs text-white/50">
          services={serviceIds.join(",")} / pros={professionalIds.join(",")}
        </p>
      </Screen>
    );
  }

  const [{ data: services }, { data: professionals }, { data: hoursData }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id,name,duration_minutes")
        .in("id", serviceIds),
      supabase
        .from("professionals")
        .select("id,name")
        .in("id", professionalIds),
      supabase.from("business_hours").select("*"),
    ]);

  const serviceMap = new Map(
    (services as ServiceRow[] | null | undefined)?.map((service) => [
      service.id,
      service,
    ]) ?? [],
  );
  const professionalMap = new Map(
    (professionals as ProfessionalRow[] | null | undefined)?.map((pro) => [
      pro.id,
      pro,
    ]) ?? [],
  );
  const orderedServices = serviceIds
    .map((id) => serviceMap.get(id))
    .filter(Boolean) as ServiceRow[];
  const packageItems = serviceIds.map((service, index) => ({
    service_id: service,
    professional_id: professionalIds[index],
    duration_minutes: serviceMap.get(service)?.duration_minutes ?? 0,
  }));

  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index));
  const openDays = days.filter((day) => getBusinessHoursForDate(day, hoursData));
  const dayFromParam = days.find((day) => formatDateKey(day) === dayParam);
  const dayFromParamHours = dayFromParam
    ? getBusinessHoursForDate(dayFromParam, hoursData)
    : null;
  const fallbackDate = days[0] ?? today;
  const selectedDate = (dayFromParamHours ? dayFromParam : openDays[0]) ?? fallbackDate;
  const selectedDateKey = formatDateKey(selectedDate);
  const selectedHours = getBusinessHoursForDate(selectedDate, hoursData);

  const slots = await getAvailablePackageSlots({
    dateKey: selectedDateKey,
    items: packageItems,
  });

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <Button
          href={`/profissional?services=${serviceIds.join(",")}${
            categoryParam ? `&category=${categoryParam}` : ""
          }`}
          variant="ghost"
        >
          Voltar
        </Button>
        <h1 className="text-2xl font-semibold">Escolha o horario</h1>
        <p className="text-sm text-white/70">
          {orderedServices.length} servico(s) selecionado(s).
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">
          Proximos dias
        </h2>
        <div className="flex flex-wrap gap-2">
          {openDays.map((day) => {
            const dayKey = formatDateKey(day);
            const isSelected = dayKey === selectedDateKey;
            return (
              <Button
                key={dayKey}
                href={`/horarios?services=${serviceIds.join(",")}&pros=${professionalIds.join(
                  ",",
                )}&day=${dayKey}${
                  categoryParam ? `&category=${categoryParam}` : ""
                }`}
                variant="outline"
                selected={isSelected}
                size="md"
              >
                {formatDayLabel(day)}
              </Button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">
          {formatLongDate(selectedDate)}
        </h2>
        {!selectedHours && (
          <p className="text-sm text-white/70">
            Salao fechado neste dia.
          </p>
        )}
        {selectedHours && slots.length === 0 && (
          <p className="text-sm text-white/70">
            Nenhum horario disponivel para este dia.
          </p>
        )}
        <div className="grid grid-cols-2 gap-3">
          {slots.map((slot) => (
            <Button
              key={slot}
              href={`/confirmar?services=${serviceIds.join(
                ",",
              )}&pros=${professionalIds.join(",")}&day=${selectedDateKey}&time=${slot}${
                categoryParam ? `&category=${categoryParam}` : ""
              }`}
              variant="outline"
              fullWidth
            >
              {slot}
            </Button>
          ))}
        </div>
      </section>
    </Screen>
  );
}
