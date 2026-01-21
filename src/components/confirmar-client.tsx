"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatLongDate } from "@/lib/datetime";
import { Screen } from "@/components/Screen";

type ServiceRow = {
  id: string;
  name?: string | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

export function ConfirmarClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceId = searchParams.get("service") ?? "";
  const professionalId = searchParams.get("pro") ?? "";
  const day = searchParams.get("day") ?? "";
  const time = searchParams.get("time") ?? "";

  const [service, setService] = useState<ServiceRow | null>(null);
  const [professional, setProfessional] = useState<ProfessionalRow | null>(null);
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

  useEffect(() => {
    if (!serviceId || !professionalId) {
      return;
    }

    supabase
      .from("services")
      .select("id,name")
      .eq("id", serviceId)
      .maybeSingle<ServiceRow>()
      .then(({ data }) => setService(data ?? null));

    supabase
      .from("professionals")
      .select("id,name")
      .eq("id", professionalId)
      .maybeSingle<ProfessionalRow>()
      .then(({ data }) => setProfessional(data ?? null));
  }, [serviceId, professionalId]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!clientName.trim() || !clientPhone.trim()) {
      setError("Informe nome e telefone.");
      return;
    }

    if (!serviceId || !professionalId || !day || !time) {
      setError("Horario invalido. Volte e selecione novamente.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_id: serviceId,
          professional_id: professionalId,
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
        <Link
          href={`/horarios?service=${serviceId}&pro=${professionalId}`}
          className="inline-flex min-h-[44px] items-center text-sm text-[#D4AF37]"
        >
          Voltar
        </Link>
        <h1 className="text-2xl font-semibold">Confirmar agendamento</h1>
        <p className="text-sm text-white/70">
          {service?.name ?? "Servico"} com {professional?.name ?? "Profissional"}
        </p>
        <p className="text-sm text-white/70">
          {dateLabel} as {time}
        </p>
      </header>

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

          <button
            type="submit"
            disabled={isSubmitting}
            className="min-h-[44px] rounded-2xl border border-[#D4AF37] bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-black transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-white active:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Confirmando..." : "Confirmar"}
          </button>
        </form>
    </Screen>
  );
}
