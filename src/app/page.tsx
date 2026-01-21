import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatMinutes } from "@/lib/datetime";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,duration_minutes")
    .order("name");

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-white/60">
          Salete Santos
        </span>
        <h1 className="text-2xl font-semibold">Escolha um servico</h1>
        <p className="text-sm text-white/70">
          Selecione o servico para ver profissionais e horarios disponiveis.
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Nao foi possivel carregar os servicos. Verifique o Supabase.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(data ?? []).map((service) => {
          const duration = service.duration_minutes ?? undefined;
          return (
            <Link
              key={service.id}
              href={`/profissional?service=${service.id}`}
              className="flex min-h-[56px] items-center justify-between rounded-2xl border border-[#D4AF37]/60 px-4 py-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] active:bg-white/10"
            >
              <div>
                <div className="text-base">{service.name ?? "Servico"}</div>
                {duration ? (
                  <div className="text-xs text-white/60">
                    {formatMinutes(duration)}
                  </div>
                ) : null}
              </div>
              <span className="text-lg text-[#D4AF37]">{">"}</span>
            </Link>
          );
        })}
      </div>
    </Screen>
  );
}
