"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMinutes } from "@/lib/datetime";
import { ButtonClient } from "@/components/ui/ButtonClient";
import { readPackageItems, writePackageItems } from "@/lib/package-store";

type ServiceOption = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

type ServiceSelectorProps = {
  services: ServiceOption[];
  categoryId?: string | null;
  categoryName?: string | null;
};

export function ServiceSelectorClient({
  services,
  categoryId,
  categoryName,
}: ServiceSelectorProps) {
  const router = useRouter();
  const [selectedItems, setSelectedItems] = useState<
    { id: string; name?: string | null; duration_minutes?: number | null }[]
  >([]);

  useEffect(() => {
    setSelectedItems(readPackageItems());
    const handleChange = () => setSelectedItems(readPackageItems());
    window.addEventListener("package:change", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("package:change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const selectedIds = useMemo(
    () => selectedItems.map((item) => item.id),
    [selectedItems],
  );

  const totalMinutes = selectedItems.reduce(
    (total, item) => total + (item.duration_minutes ?? 0),
    0,
  );

  const toggleService = (serviceId: string) => {
    const service = services.find((item) => item.id === serviceId);
    setSelectedItems((prev) => {
      const exists = prev.some((item) => item.id === serviceId);
      const next = exists
        ? prev.filter((item) => item.id !== serviceId)
        : [
            ...prev,
            {
              id: serviceId,
              name: service?.name ?? null,
              duration_minutes: service?.duration_minutes ?? null,
            },
          ];
      writePackageItems(next);
      return next;
    });
  };

  const handleContinue = () => {
    if (selectedIds.length === 0) {
      return;
    }
    const query = selectedIds.join(",");
    const categoryParam = categoryId ? `&category=${categoryId}` : "";
    router.push(
      `/profissional?services=${encodeURIComponent(query)}${categoryParam}`,
    );
  };

  const handleAddMore = () => {
    router.push("/");
  };

  const getDisplayName = (name?: string | null) => {
    if (!name) {
      return "Servico";
    }

    let display = name.trim();
    const categoryLower = (categoryName ?? "").toLowerCase();
    const isDepilacaoCategory =
      categoryLower === "depilação" || categoryLower === "depilacao";

    const lower = display.toLowerCase();
    if (
      lower.startsWith("depilação -") ||
      lower.startsWith("depilacao -") ||
      isDepilacaoCategory
    ) {
      display = display
        .replace(/^depilação\s*-\s*/i, "")
        .replace(/^depilacao\s*-\s*/i, "")
        .trim();
    }

    const isUnhasCategory = categoryLower === "unhas";
    const unhasLower = display.toLowerCase();
    if (isUnhasCategory || unhasLower.startsWith("unha ")) {
      if (unhasLower === "unha de gel") {
        return display;
      }
      if (unhasLower === "unha mão e pé" || unhasLower === "unha mao e pe") {
        return "Mão e Pé";
      }
      if (unhasLower.startsWith("unha ")) {
        return display.replace(/^unha\s+/i, "").trim();
      }
    }

    return display;
  };

  return (
    <div className="flex flex-col gap-4">
      {selectedIds.length > 0 && (
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-white/5 px-4 py-3 text-sm text-white/70">
          Selecionados: {selectedIds.length} / Tempo total:{" "}
          {formatMinutes(totalMinutes) || "0 min"}
        </div>
      )}

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
              className="justify-between text-left items-start"
              onClick={() => toggleService(service.id)}
            >
              <div className="flex flex-col flex-1 text-left">
                <div className="text-base">
                  {getDisplayName(service.name)}
                </div>
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

      <div className="flex flex-col gap-3">
        <ButtonClient
          type="button"
          variant="ghost"
          size="lg"
          fullWidth
          onClick={handleAddMore}
        >
          Adicionar mais servicos
        </ButtonClient>
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
    </div>
  );
}
