import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  addDays,
  formatDateKey,
  formatDayLabel,
  formatLongDate,
} from "@/lib/datetime";
import { getAvailableSlots, getBusinessHoursForDate } from "@/lib/availability";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

type SearchParams = {
  service?: string;
  pro?: string;
  day?: string;
};

type ServiceRow = {
  id: string;
  name?: string | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

export default async function HorariosPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const serviceId = searchParams.service;
  const professionalId = searchParams.pro;

  if (!serviceId || !professionalId) {
    return (
      <Screen>
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm text-[#D4AF37]">
          Voltar
        </Link>
        <p className="text-sm text-white/70">Parametros incompletos.</p>
      </Screen>
    );
  }

  const [{ data: service }, { data: professional }, { data: hoursData }] =
    await Promise.all([
      supabase
        .from("services")
        .select("id,name")
        .eq("id", serviceId)
        .maybeSingle<ServiceRow>(),
      supabase
        .from("professionals")
        .select("id,name")
        .eq("id", professionalId)
        .maybeSingle<ProfessionalRow>(),
      supabase.from("business_hours").select("*"),
    ]);

  const today = new Date();
  const days = Array.from({ length: 14 }, (_, index) => addDays(today, index));

  const selectedDate =
    days.find((day) => formatDateKey(day) === searchParams.day) ??
    days.find((day) => getBusinessHoursForDate(day, hoursData)) ??
    days[0];

  const selectedDateKey = formatDateKey(selectedDate);
  const selectedHours = getBusinessHoursForDate(selectedDate, hoursData);

  const slots = await getAvailableSlots(
    professionalId,
    serviceId,
    selectedDateKey,
  );

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <Link
          href={`/profissional?service=${serviceId}`}
          className="inline-flex min-h-[44px] items-center text-sm text-[#D4AF37]"
        >
          Voltar
        </Link>
        <h1 className="text-2xl font-semibold">Escolha o horario</h1>
        <p className="text-sm text-white/70">
          {service?.name ?? "Servico"} com {professional?.name ?? "Profissional"}
        </p>
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm uppercase tracking-[0.3em] text-white/60">
          Proximos dias
        </h2>
        <div className="flex flex-wrap gap-2">
          {days.map((day) => {
            const dayKey = formatDateKey(day);
            const dayHours = getBusinessHoursForDate(day, hoursData);
            const isSelected = dayKey === selectedDateKey;
            const baseClasses =
              "rounded-2xl border px-3 py-2 text-xs transition-colors min-h-[44px] flex items-center justify-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] active:bg-white/10";
            const classes = isSelected
              ? `${baseClasses} border-[#D4AF37] text-[#D4AF37]`
              : `${baseClasses} border-white/20 text-white/70`;

            if (!dayHours) {
              return (
                <span
                  key={dayKey}
                  className={`${baseClasses} border-white/10 text-white/30`}
                >
                  {formatDayLabel(day)} - Fechado
                </span>
              );
            }

            return (
              <Link
                key={dayKey}
                href={`/horarios?service=${serviceId}&pro=${professionalId}&day=${dayKey}`}
                className={classes}
              >
                {formatDayLabel(day)}
              </Link>
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
            <Link
              key={slot}
              href={`/confirmar?service=${serviceId}&pro=${professionalId}&day=${selectedDateKey}&time=${slot}`}
              className="flex min-h-[44px] items-center justify-center rounded-2xl border border-[#D4AF37]/60 px-2 text-center text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] active:bg-white/10"
            >
              {slot}
            </Link>
          ))}
        </div>
      </section>
    </Screen>
  );
}
