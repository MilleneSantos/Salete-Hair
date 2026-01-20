"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/datetime";

type AppointmentView = {
  id: string;
  client_name?: string | null;
  client_phone?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  status?: string | null;
  service_name?: string | null;
  professional_name?: string | null;
  professional_id?: string | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

type AdminClientProps = {
  appointments: AppointmentView[];
  professionals: ProfessionalRow[];
  selectedDate: string;
};

export function AdminClient({
  appointments,
  professionals,
  selectedDate,
}: AdminClientProps) {
  const router = useRouter();
  const [blockProfessionalId, setBlockProfessionalId] = useState<string>("");
  const [blockStart, setBlockStart] = useState("09:00");
  const [blockEnd, setBlockEnd] = useState("10:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockError, setBlockError] = useState<string | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  async function handleCancel(id: string) {
    setCancelId(id);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "cancelled" }),
    });
    setCancelId(null);
    router.refresh();
  }

  async function handleBlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBlockError(null);
    setBlockLoading(true);

    try {
      const response = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          professional_id: blockProfessionalId || null,
          date: selectedDate,
          start_time: blockStart,
          end_time: blockEnd,
          reason: blockReason.trim() || null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setBlockError(payload?.error ?? "Erro ao criar bloqueio.");
        return;
      }

      setBlockReason("");
      router.refresh();
    } finally {
      setBlockLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={handleBlock}
        className="flex flex-col gap-3 rounded border border-white/10 px-4 py-3"
      >
        <div className="text-sm font-semibold text-[#D4AF37]">
          Bloquear horario
        </div>
        <label className="flex flex-col gap-2 text-xs">
          Profissional (opcional)
          <select
            className="rounded border border-[#D4AF37]/60 bg-black px-3 py-2 text-sm"
            value={blockProfessionalId}
            onChange={(event) => setBlockProfessionalId(event.target.value)}
          >
            <option value="">Todos</option>
            {professionals.map((pro) => (
              <option key={pro.id} value={pro.id}>
                {pro.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-xs">
            Inicio
            <input
              className="rounded border border-[#D4AF37]/60 bg-black px-3 py-2 text-sm"
              type="time"
              step={600}
              value={blockStart}
              onChange={(event) => setBlockStart(event.target.value)}
              required
            />
          </label>
          <label className="flex flex-col gap-2 text-xs">
            Fim
            <input
              className="rounded border border-[#D4AF37]/60 bg-black px-3 py-2 text-sm"
              type="time"
              step={600}
              value={blockEnd}
              onChange={(event) => setBlockEnd(event.target.value)}
              required
            />
          </label>
        </div>
        <label className="flex flex-col gap-2 text-xs">
          Motivo (opcional)
          <input
            className="rounded border border-[#D4AF37]/60 bg-black px-3 py-2 text-sm"
            value={blockReason}
            onChange={(event) => setBlockReason(event.target.value)}
            placeholder="Ex: almoco"
          />
        </label>

        {blockError && (
          <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {blockError}
          </p>
        )}

        <button
          type="submit"
          disabled={blockLoading}
          className="rounded border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60"
        >
          {blockLoading ? "Bloqueando..." : "Criar bloqueio"}
        </button>
      </form>

      <div className="flex flex-col gap-3">
        {appointments.length === 0 && (
          <p className="text-sm text-white/70">
            Nenhum agendamento para este dia.
          </p>
        )}
        {appointments.map((appointment) => {
          const startDate = appointment.starts_at
            ? new Date(appointment.starts_at)
            : null;
          return (
            <div
              key={appointment.id}
              className="flex flex-col gap-2 rounded border border-white/10 px-4 py-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#D4AF37]">
                  {startDate ? formatTime(startDate) : "--:--"}
                </span>
                <span className="text-xs text-white/60">
                  {appointment.status ?? "confirmado"}
                </span>
              </div>
              <div className="text-base font-semibold">
                {appointment.service_name ?? "Servico"}
              </div>
              <div className="text-sm text-white/70">
                {appointment.professional_name ?? "Profissional"}
              </div>
              <div className="text-sm">
                {appointment.client_name ?? "Cliente"} ·{" "}
                {appointment.client_phone ?? "-"}
              </div>
              <button
                type="button"
                onClick={() => handleCancel(appointment.id)}
                disabled={appointment.status === "cancelled" || cancelId === appointment.id}
                className="mt-2 rounded border border-[#D4AF37]/60 px-3 py-2 text-xs text-[#D4AF37] disabled:opacity-40"
              >
                {appointment.status === "cancelled"
                  ? "Cancelado"
                  : cancelId === appointment.id
                    ? "Cancelando..."
                    : "Cancelar"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
