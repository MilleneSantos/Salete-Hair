import { supabase } from "@/lib/supabase";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";
import { ProfessionalSelectorClient } from "@/components/professional-selector-client";

export const dynamic = "force-dynamic";

type ServiceRow = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

export default async function ProfissionalPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedParams = await searchParams;
  const getParam = (key: string) => {
    const value = resolvedParams[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const serviceParam = getParam("service");
  const servicesParam = getParam("services");
  const categoryParam = getParam("category");
  const listFromParam = (value?: string) =>
    value
      ? value
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [];
  const serviceIds = servicesParam
    ? listFromParam(servicesParam)
    : serviceParam
      ? [serviceParam]
      : [];

  if (serviceIds.length === 0) {
    return (
      <Screen>
        <Button href="/" variant="ghost">
          Voltar
        </Button>
        <p className="text-sm text-white/70">Servico nao informado.</p>
      </Screen>
    );
  }

  const { data: services, error: serviceError } = await supabase
    .from("services")
    .select("id,name,duration_minutes")
    .in("id", serviceIds);

  const { data: serviceLinks, error: linksError } = await supabase
    .from("service_professionals")
    .select("service_id,professional_id")
    .in("service_id", serviceIds);

  const professionalIds =
    serviceLinks?.map((item) => item.professional_id).filter(Boolean) ?? [];

  const { data: professionals, error: proError } = professionalIds.length
    ? await supabase
        .from("professionals")
        .select("id,name")
        .in("id", professionalIds)
        .order("name")
    : { data: [], error: null };

  const serviceMap = new Map(
    (services as ServiceRow[] | null | undefined)?.map((service) => [
      service.id,
      service,
    ]) ?? [],
  );
  const orderedServices = serviceIds
    .map((id) => serviceMap.get(id))
    .filter(Boolean) as ServiceRow[];

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <Button
          href={categoryParam ? `/servicos?category=${categoryParam}` : "/"}
          variant="ghost"
        >
          Voltar
        </Button>
        <h1 className="text-2xl font-semibold">Quem vai fazer?</h1>
        <p className="text-sm text-white/70">
          Selecione a profissional para cada servico.
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

      {!professionals?.length && !linksError ? (
        <p className="text-sm text-white/70">
          Nenhuma profissional cadastrada para este servico.
        </p>
      ) : (
        <ProfessionalSelectorClient
          services={orderedServices}
          professionals={(professionals ?? []) as { id: string; name?: string | null }[]}
          links={(serviceLinks ?? []) as { service_id?: string | null; professional_id?: string | null }[]}
          categoryId={categoryParam}
        />
      )}
    </Screen>
  );
}
