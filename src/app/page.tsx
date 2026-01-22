import { supabase } from "@/lib/supabase";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

type CategoryRow = {
  id: string;
  name?: string | null;
};

export default async function Home() {
  const { data, error } = await supabase
    .from("service_categories")
    .select("id,name,sort_order,active")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <span className="text-xs uppercase tracking-[0.3em] text-white/60">
          Salete Santos
        </span>
        <h1 className="text-2xl font-semibold">Escolha uma categoria</h1>
        <p className="text-sm text-white/70">
          Selecione a categoria para ver os servicos disponiveis.
        </p>
      </header>

      {error && (
        <p className="rounded-2xl border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Nao foi possivel carregar as categorias. Verifique o Supabase.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {(data as CategoryRow[] | null | undefined)?.map((category) => (
          <Button
            key={category.id}
            href={`/servicos?category=${category.id}`}
            variant="outline"
            size="lg"
            fullWidth
            className="justify-between text-left"
          >
            <span className="text-base">{category.name ?? "Categoria"}</span>
            <span className="text-lg text-[#D4AF37]">{">"}</span>
          </Button>
        ))}
      </div>
    </Screen>
  );
}
