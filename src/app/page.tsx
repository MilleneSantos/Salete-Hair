import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatMinutes } from "@/lib/datetime";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data, error } = await supabase
    .from("services")
    .select("id,name,duration_minutes,duration")
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
        <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Nao foi possivel carregar os servicos. Verifique o Supabase.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(data ?? []).map((service) => {
          const duration =
            service.duration_minutes ?? service.duration ?? undefined;
          return (
            <Link
              key={service.id}
              href={`/profissional?service=${service.id}`}
              className="flex items-center justify-between rounded-md border border-[#D4AF37]/60 px-4 py-3 transition hover:bg-white/5"
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
