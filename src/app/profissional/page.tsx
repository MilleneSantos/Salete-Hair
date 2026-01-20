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
  searchParams: { service?: string };
}) {
  const serviceId = searchParams.service;

  if (!serviceId) {
    return (
      <Screen>
        <Link href="/" className="text-sm text-[#D4AF37]">
          Voltar
        </Link>
        <p className="text-sm text-white/70">Servico nao informado.</p>
      </Screen>
    );
  }

  const { data: service } = await supabase
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
        <Link href="/" className="text-sm text-[#D4AF37]">
          Voltar
        </Link>
        <h1 className="text-2xl font-semibold">Escolha a profissional</h1>
        <p className="text-sm text-white/70">
          {service?.name
            ? `Servico: ${service.name}`
            : "Selecione uma profissional disponivel."}
        </p>
      </header>

      {(linksError || proError) && (
        <p className="rounded border border-red-500/60 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          Nao foi possivel carregar as profissionais.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(professionals ?? []).map((pro) => (
          <Link
            key={pro.id}
            href={`/horarios?service=${serviceId}&pro=${pro.id}`}
            className="flex items-center justify-between rounded-md border border-[#D4AF37]/60 px-4 py-3 transition hover:bg-white/5"
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
