"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatLongDate, formatTime } from "@/lib/datetime";
import { buildPackageSchedule } from "@/lib/availability";
import { Screen } from "@/components/Screen";
import { ButtonClient } from "@/components/ui/ButtonClient";

type ServiceRow = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

export function ConfirmarClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryId = searchParams.get("category") ?? "";
  const parseList = (value: string) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  const servicesParam = searchParams.get("services") ?? "";
  const prosParam = searchParams.get("pros") ?? "";
  const serviceParam = searchParams.get("service") ?? "";
  const proParam = searchParams.get("pro") ?? "";
  const serviceIds = servicesParam
    ? parseList(servicesParam)
    : serviceParam
      ? [serviceParam]
      : [];
  const professionalIds = prosParam
    ? parseList(prosParam)
    : proParam
      ? [proParam]
      : [];
  const day = searchParams.get("day") ?? "";
  const time = searchParams.get("time") ?? "";

  const [services, setServices] = useState<ServiceRow[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalRow[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const dateLabel = useMemo(() => {
    if (!day) {
      return "";
    }
    return formatLongDate(new Date(`${day}T00:00:00-03:00`));
  }, [day]);

  const paramsValid =
    serviceIds.length > 0 &&
    professionalIds.length > 0 &&
    serviceIds.length === professionalIds.length;

  useEffect(() => {
    if (!paramsValid) {
      return;
    }

    supabase
      .from("services")
      .select("id,name,duration_minutes")
      .in("id", serviceIds)
      .then(({ data }) => setServices((data ?? []) as ServiceRow[]));

    supabase
      .from("professionals")
      .select("id,name")
      .in("id", professionalIds)
      .then(({ data }) => setProfessionals((data ?? []) as ProfessionalRow[]));
  }, [paramsValid, serviceIds, professionalIds]);

  const serviceMap = useMemo(() => {
    const map = new Map<string, ServiceRow>();
    services.forEach((service) => map.set(service.id, service));
    return map;
  }, [services]);

  const professionalMap = useMemo(() => {
    const map = new Map<string, ProfessionalRow>();
    professionals.forEach((pro) => map.set(pro.id, pro));
    return map;
  }, [professionals]);

  const packageItems = useMemo(() => {
    if (!paramsValid) {
      return [];
    }
    return serviceIds.map((serviceId, index) => ({
      service_id: serviceId,
      professional_id: professionalIds[index],
      duration_minutes: serviceMap.get(serviceId)?.duration_minutes ?? 0,
    }));
  }, [paramsValid, serviceIds, professionalIds, serviceMap]);

  const schedule = useMemo(() => {
    if (!day || !time || packageItems.length === 0) {
      return null;
    }
    return buildPackageSchedule({
      dateKey: day,
      startTime: time,
      items: packageItems,
    });
  }, [day, time, packageItems]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!clientName.trim() || !clientPhone.trim()) {
      setError("Informe nome e telefone.");
      return;
    }

    if (!paramsValid || !day || !time) {
      setError("Horario invalido. Volte e selecione novamente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          services: serviceIds,
          professionals: professionalIds,
          client_name: clientName.trim(),
          client_phone: clientPhone.trim(),
          client_email: clientEmail.trim() || null,
          date: day,
          time,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        setError(payload?.error ?? "Nao foi possivel confirmar.");
        return;
      }

      router.push(`/sucesso?id=${payload.id}`);
    } catch {
      setError("Erro ao confirmar. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <ButtonClient
          href={`/horarios?services=${serviceIds.join(
            ",",
          )}&pros=${professionalIds.join(",")}${
            categoryId ? `&category=${categoryId}` : ""
          }`}
          variant="ghost"
        >
          Voltar
        </ButtonClient>
        <h1 className="text-2xl font-semibold">Confirmar agendamento</h1>
        <p className="text-sm text-white/70">
          {serviceIds.length} servico(s) selecionado(s).
        </p>
        <p className="text-sm text-white/70">
          {dateLabel} as {time}
        </p>
      </header>

      {schedule?.steps?.length ? (
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-white/5 px-4 py-4">
          <div className="text-sm font-semibold text-[#D4AF37]">
            Resumo do pacote
          </div>
          <div className="mt-3 flex flex-col gap-2 text-sm">
            {schedule.steps.map((step) => (
              <div key={`${step.service_id}-${step.order_index}`}>
                <div className="text-white">
                  {formatTime(step.starts_at)}–{formatTime(step.ends_at)}{" "}
                  {serviceMap.get(step.service_id)?.name ?? "Servico"}
                </div>
                <div className="text-white/60">
                  {professionalMap.get(step.professional_id)?.name ??
                    "Profissional"}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-white/70">
          Nao foi possivel montar o resumo do pacote.
        </p>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <label className="flex flex-col gap-2 text-sm">
            Nome
            <input
              className="min-h-[44px] rounded-2xl border border-[#D4AF37]/60 bg-black px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
              value={clientName}
              onChange={(event) => setClientName(event.target.value)}
              placeholder="Seu nome"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Telefone
            <input
              className="min-h-[44px] rounded-2xl border border-[#D4AF37]/60 bg-black px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
              value={clientPhone}
              onChange={(event) => setClientPhone(event.target.value)}
              placeholder="(11) 99999-0000"
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-sm">
            Email (opcional)
            <input
              className="min-h-[44px] rounded-2xl border border-[#D4AF37]/60 bg-black px-4 py-2 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
              value={clientEmail}
              onChange={(event) => setClientEmail(event.target.value)}
              placeholder="voce@email.com"
              type="email"
            />
          </label>

          {error && (
            <p className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <ButtonClient
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
          >
            {isSubmitting ? "Confirmando..." : "Confirmar"}
          </ButtonClient>
        </form>
    </Screen>
  );
}
