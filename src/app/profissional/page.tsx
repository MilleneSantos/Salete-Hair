import { supabase } from "@/lib/supabase";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";

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
        <Button href="/" variant="ghost">
          Voltar
        </Button>
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
        <Button href="/" variant="ghost">
          Voltar
        </Button>
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
          <Button
            key={pro.id}
            href={`/horarios?service=${serviceId}&pro=${pro.id}`}
            variant="outline"
            size="lg"
            fullWidth
            className="justify-between text-left"
          >
            <span className="text-base">{pro.name ?? "Profissional"}</span>
            <span className="text-lg text-[#D4AF37]">{">"}</span>
          </Button>
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
