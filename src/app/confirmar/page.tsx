import { Suspense } from "react";
import { ConfirmarClient } from "@/components/confirmar-client";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

export default function ConfirmarPage() {
  return (
    <Suspense
      fallback={
        <Screen>
          <p className="text-sm text-white/70">Carregando...</p>
        </Screen>
      }
    >
      <ConfirmarClient />
    </Suspense>
  );
}
