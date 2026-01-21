import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Screen } from "@/components/Screen";

export const dynamic = "force-dynamic";

type ServiceRow = {
  id: string;
  name?: string | null;
};

export default async function ProfissionalPage({
  searchParams,
}: {
  searchParams: Promise<{ service?: string | string[] }>;
}) {
  const resolvedParams = await searchParams;
  const serviceParam = resolvedParams.service;
  const serviceId = Array.isArray(serviceParam) ? serviceParam[0] : serviceParam;

  if (!serviceId) {
    return (
      <Screen>
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm text-[#D4AF37]">
          Voltar
        </Link>
        <p className="text-sm text-white/70">Servico nao informado.</p>
      </Screen>
    );
  }

  const { data: service, error: serviceError } = await supabase
    .from("services")
    .select("id,name")
    .eq("id", serviceId)
    .maybeSingle<ServiceRow>();

  const { data: serviceLinks, error: linksError } = await supabase
    .from("service_professionals")
    .select("professional_id")
    .eq("service_id", serviceId);

  const professionalIds =
    serviceLinks?.map((item) => item.professional_id).filter(Boolean) ?? [];

  const { data: professionals, error: proError } = professionalIds.length
    ? await supabase
        .from("professionals")
        .select("id,name")
        .in("id", professionalIds)
        .order("name")
    : { data: [], error: null };

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <Link href="/" className="inline-flex min-h-[44px] items-center text-sm text-[#D4AF37]">
          Voltar
        </Link>
        <h1 className="text-2xl font-semibold">Escolha a profissional</h1>
        <p className="text-sm text-white/70">
          {service?.name
            ? `Servico: ${service.name}`
            : "Selecione uma profissional disponivel."}
        </p>
      </header>

      {(serviceError || linksError || proError) && (
        <p className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Nao foi possivel carregar as profissionais.
          <span className="block text-xs text-red-100/80">
            Detalhes:{" "}
            {[
              serviceError?.message,
              linksError?.message,
              proError?.message,
            ]
              .filter(Boolean)
              .join(" | ") || "Erro desconhecido."}
          </span>
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(professionals ?? []).map((pro) => (
          <Link
            key={pro.id}
            href={`/horarios?service=${serviceId}&pro=${pro.id}`}
            className="flex min-h-[56px] items-center justify-between rounded-2xl border border-[#D4AF37]/60 px-4 py-4 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37] active:bg-white/10"
          >
            <span className="text-base">{pro.name ?? "Profissional"}</span>
            <span className="text-lg text-[#D4AF37]">{">"}</span>
          </Link>
        ))}
        {!professionals?.length && !linksError && (
          <p className="text-sm text-white/70">
            Nenhuma profissional cadastrada para este servico.
          </p>
        )}
      </div>
    </Screen>
  );
}
