"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMinutes } from "@/lib/datetime";
import { ButtonClient } from "@/components/ui/ButtonClient";

type ServiceOption = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

type ServiceSelectorProps = {
  services: ServiceOption[];
};

export function ServiceSelectorClient({ services }: ServiceSelectorProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedServices = useMemo(
    () => services.filter((service) => selectedIds.includes(service.id)),
    [services, selectedIds],
  );

  const totalMinutes = selectedServices.reduce(
    (total, service) => total + (service.duration_minutes ?? 0),
    0,
  );

  const toggleService = (serviceId: string) => {
    setSelectedIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId],
    );
  };

  const handleContinue = () => {
    if (selectedIds.length === 0) {
      return;
    }
    const query = selectedIds.join(",");
    router.push(`/profissional?services=${encodeURIComponent(query)}`);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[#D4AF37]/30 bg-white/5 px-4 py-3 text-sm">
        <div className="text-white/70">
          Selecionados: {selectedIds.length}
        </div>
        <div className="text-white/70">
          Tempo estimado: {formatMinutes(totalMinutes) || "0 min"}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {services.map((service) => {
          const selected = selectedIds.includes(service.id);
          return (
            <ButtonClient
              key={service.id}
              type="button"
              variant="outline"
              size="lg"
              fullWidth
              selected={selected}
              className="justify-between text-left"
              onClick={() => toggleService(service.id)}
            >
              <div>
                <div className="text-base">{service.name ?? "Servico"}</div>
                {service.duration_minutes ? (
                  <div className="text-xs text-white/60">
                    {formatMinutes(service.duration_minutes)}
                  </div>
                ) : null}
              </div>
              <span className="text-lg text-[#D4AF37]">{selected ? "✓" : ">"}</span>
            </ButtonClient>
          );
        })}
      </div>

      <ButtonClient
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        disabled={selectedIds.length === 0}
        onClick={handleContinue}
      >
        Continuar
      </ButtonClient>
    </div>
  );
}
