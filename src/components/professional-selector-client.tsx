"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ButtonClient } from "@/components/ui/ButtonClient";

type ServiceOption = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

type ProfessionalOption = {
  id: string;
  name?: string | null;
};

type ServiceProfessionalLink = {
  service_id?: string | null;
  professional_id?: string | null;
};

type ProfessionalSelectorProps = {
  services: ServiceOption[];
  professionals: ProfessionalOption[];
  links: ServiceProfessionalLink[];
  categoryId?: string | null;
};

export function ProfessionalSelectorClient({
  services,
  professionals,
  links,
  categoryId,
}: ProfessionalSelectorProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<Record<string, string>>({});

  const professionalsById = useMemo(() => {
    const map = new Map<string, ProfessionalOption>();
    professionals.forEach((pro) => {
      map.set(pro.id, pro);
    });
    return map;
  }, [professionals]);

  const serviceOptions = useMemo(() => {
    const map = new Map<string, string[]>();
    services.forEach((service) => {
      map.set(service.id, []);
    });
    links.forEach((link) => {
      const serviceId = link.service_id ?? "";
      const professionalId = link.professional_id ?? "";
      if (!serviceId || !professionalId) {
        return;
      }
      if (!map.has(serviceId)) {
        return;
      }
      const list = map.get(serviceId);
      if (list && !list.includes(professionalId)) {
        list.push(professionalId);
      }
    });
    return map;
  }, [services, links]);

  const commonProfessionalIds = useMemo(() => {
    if (services.length === 0) {
      return [];
    }
    let intersection: string[] | null = null;
    services.forEach((service) => {
      const current = serviceOptions.get(service.id) ?? [];
      if (intersection === null) {
        intersection = [...current];
        return;
      }
      intersection = intersection.filter((id) => current.includes(id));
    });
    return intersection ?? [];
  }, [services, serviceOptions]);

  const allSelected = services.every((service) => selection[service.id]);

  const setAllToProfessional = (professionalId: string) => {
    const next: Record<string, string> = {};
    services.forEach((service) => {
      next[service.id] = professionalId;
    });
    setSelection(next);
  };

  const handleContinue = () => {
    if (!allSelected) {
      return;
    }
    const serviceIds = services.map((service) => service.id);
    const professionalIds = services.map((service) => selection[service.id]);
    const categoryParam = categoryId ? `&category=${categoryId}` : "";
    router.push(
      `/horarios?services=${encodeURIComponent(
        serviceIds.join(","),
      )}&pros=${encodeURIComponent(professionalIds.join(","))}${categoryParam}`,
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {commonProfessionalIds.length > 0 && (
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-white/5 px-4 py-4">
          <div className="text-sm font-semibold text-[#D4AF37]">
            Fazer tudo com a mesma pessoa
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {commonProfessionalIds.map((id) => {
              const pro = professionalsById.get(id);
              if (!pro) {
                return null;
              }
              const selected = services.every(
                (service) => selection[service.id] === id,
              );
              return (
                <ButtonClient
                  key={id}
                  type="button"
                  variant="outline"
                  selected={selected}
                  onClick={() => setAllToProfessional(id)}
                >
                  {pro.name ?? "Profissional"}
                </ButtonClient>
              );
            })}
          </div>
        </div>
      )}

      {services.map((service) => {
        const servicePros = serviceOptions.get(service.id) ?? [];
        return (
          <div
            key={service.id}
            className="rounded-2xl border border-white/10 px-4 py-4"
          >
            <div className="text-sm text-white/70">Servico</div>
            <div className="text-base font-semibold">
              {service.name ?? "Servico"}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {servicePros.map((proId) => {
                const pro = professionalsById.get(proId);
                if (!pro) {
                  return null;
                }
                const selected = selection[service.id] === proId;
                return (
                  <ButtonClient
                    key={proId}
                    type="button"
                    variant="outline"
                    selected={selected}
                    onClick={() =>
                      setSelection((prev) => ({
                        ...prev,
                        [service.id]: proId,
                      }))
                    }
                  >
                    {pro.name ?? "Profissional"}
                  </ButtonClient>
                );
              })}
            </div>
          </div>
        );
      })}

      {!allSelected && (
        <p className="text-sm text-white/70">
          Selecione uma profissional para cada servico.
        </p>
      )}

      <ButtonClient
        type="button"
        variant="primary"
        size="lg"
        fullWidth
        disabled={!allSelected}
        onClick={handleContinue}
      >
        Continuar
      </ButtonClient>
    </div>
  );
}
