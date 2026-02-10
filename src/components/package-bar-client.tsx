"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMinutes } from "@/lib/datetime";
import { readPackageItems } from "@/lib/package-store";
import { ButtonClient } from "@/components/ui/ButtonClient";

export function PackageBarClient() {
  const router = useRouter();
  const [items, setItems] = useState(readPackageItems());

  useEffect(() => {
    const handleChange = () => setItems(readPackageItems());
    window.addEventListener("package:change", handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener("package:change", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const totalMinutes = useMemo(
    () =>
      items.reduce(
        (total, item) => total + (item.duration_minutes ?? 0),
        0,
      ),
    [items],
  );

  const handleContinue = () => {
    if (items.length === 0) {
      return;
    }
    const query = items.map((item) => item.id).join(",");
    router.push(`/profissional?services=${encodeURIComponent(query)}`);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-[#D4AF37]/30 bg-black/90">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3 px-6 py-3">
        <div className="text-xs text-white/70">
          Selecionados: {items.length} | Tempo total:{" "}
          {formatMinutes(totalMinutes) || "0 min"}
        </div>
        <ButtonClient
          type="button"
          variant="primary"
          size="md"
          disabled={items.length === 0}
          onClick={handleContinue}
        >
          Ver pacote / Continuar
        </ButtonClient>
      </div>
    </div>
  );
}
