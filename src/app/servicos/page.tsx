import { supabase } from "@/lib/supabase";
import { formatMinutes } from "@/lib/datetime";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  name?: string | null;
};

type ServiceRow = {
  id: string;
  name?: string | null;
  duration_minutes?: number | null;
};

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ServicosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const categoryParam = params.category;
  const categoryId = Array.isArray(categoryParam)
    ? categoryParam[0]
    : categoryParam;

  if (!categoryId) {
    return (
      <Screen>
        <Button href="/" variant="ghost">
          Voltar
        </Button>
        <p className="text-sm text-white/70">Categoria nao informada.</p>
      </Screen>
    );
  }

  const [{ data: category }, { data: services, error: servicesError }] =
    await Promise.all([
      supabase
        .from("service_categories")
        .select("id,name")
        .eq("id", categoryId)
        .maybeSingle<CategoryRow>(),
      supabase
        .from("services")
        .select("id,name,duration_minutes")
        .eq("category_id", categoryId)
        .order("name"),
    ]);

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <Button href="/" variant="ghost">
          Voltar
        </Button>
        <h1 className="text-2xl font-semibold">Escolha um servico</h1>
        <p className="text-sm text-white/70">
          {category?.name
            ? `Categoria: ${category.name}`
            : "Selecione um servico disponivel."}
        </p>
      </header>

      {servicesError && (
        <p className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Nao foi possivel carregar os servicos. Verifique o Supabase.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(services as ServiceRow[] | null | undefined)?.map((service) => (
          <Button
            key={service.id}
            href={`/profissional?service=${service.id}`}
            variant="outline"
            size="lg"
            fullWidth
            className="justify-between text-left"
          >
            <div>
              <div className="text-base">{service.name ?? "Servico"}</div>
              {service.duration_minutes ? (
                <div className="text-xs text-white/60">
                  {formatMinutes(service.duration_minutes)}
                </div>
              ) : null}
            </div>
            <span className="text-lg text-[#D4AF37]">{">"}</span>
          </Button>
        ))}
        {!services?.length && !servicesError && (
          <p className="text-sm text-white/70">
            Nenhum servico encontrado nesta categoria.
          </p>
        )}
      </div>
    </Screen>
  );
}
