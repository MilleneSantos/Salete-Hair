import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatDateKey, formatLongDate } from "@/lib/datetime";
import { AdminClient } from "@/components/admin-client";

export const dynamic = "force-dynamic";

type ServiceRow = {
  id: string;
  name?: string | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { day?: string; pro?: string };
}) {
  const today = new Date();
  const selectedDate = searchParams.day ?? formatDateKey(today);
  const selectedProfessional = searchParams.pro ?? "all";

  const dayStart = new Date(`${selectedDate}T00:00:00-03:00`).toISOString();
  const dayEnd = new Date(`${selectedDate}T23:59:59-03:00`).toISOString();

  let appointmentsQuery = supabase
    .from("appointments")
    .select(
      "id,client_name,client_phone,starts_at,ends_at,status,service_id,professional_id",
    )
    .lt("starts_at", dayEnd)
    .gt("ends_at", dayStart)
    .order("starts_at", { ascending: true });

  if (selectedProfessional !== "all") {
    appointmentsQuery = appointmentsQuery.eq("professional_id", selectedProfessional);
  }

  const [{ data: appointments }, { data: professionals }] = await Promise.all([
    appointmentsQuery,
    supabase.from("professionals").select("id,name").order("name"),
  ]);

  const serviceIds =
    appointments?.map((item) => item.service_id).filter(Boolean) ?? [];
  const professionalIds =
    appointments?.map((item) => item.professional_id).filter(Boolean) ?? [];

  const [{ data: services }, { data: appointmentPros }] = await Promise.all([
    serviceIds.length
      ? supabase.from("services").select("id,name").in("id", serviceIds)
      : Promise.resolve({ data: [] }),
    professionalIds.length
      ? supabase
          .from("professionals")
          .select("id,name")
          .in("id", professionalIds)
      : Promise.resolve({ data: [] }),
  ]);

  const serviceMap = new Map(
    (services as ServiceRow[] | null | undefined)?.map((service) => [
      service.id,
      service.name ?? "",
    ]) ?? [],
  );
  const professionalMap = new Map(
    (appointmentPros as ProfessionalRow[] | null | undefined)?.map((pro) => [
      pro.id,
      pro.name ?? "",
    ]) ?? [],
  );

  const viewAppointments = (appointments ?? []).map((appointment) => ({
    ...appointment,
    service_name: appointment.service_id
      ? serviceMap.get(appointment.service_id) ?? ""
      : "",
    professional_name: appointment.professional_id
      ? professionalMap.get(appointment.professional_id) ?? ""
      : "",
  }));

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col gap-6 px-5 pb-10 pt-6">
        <header className="flex flex-col gap-2">
          <Link href="/" className="text-sm text-[#D4AF37]">
            Voltar
          </Link>
          <h1 className="text-2xl font-semibold">Painel do salao</h1>
          <p className="text-sm text-white/70">
            {formatLongDate(new Date(`${selectedDate}T00:00:00-03:00`))}
          </p>
        </header>

        <form className="grid gap-3" method="GET">
          <label className="flex flex-col gap-2 text-xs">
            Dia
            <input
              className="rounded border border-[#D4AF37]/60 bg-black px-3 py-2 text-sm"
              type="date"
              name="day"
              defaultValue={selectedDate}
            />
          </label>
          <label className="flex flex-col gap-2 text-xs">
            Visualizacao
            <select
              className="rounded border border-[#D4AF37]/60 bg-black px-3 py-2 text-sm"
              name="pro"
              defaultValue={selectedProfessional}
            >
              <option value="all">Salete (tudo)</option>
              {(professionals as ProfessionalRow[] | null | undefined)?.map(
                (pro) => (
                  <option key={pro.id} value={pro.id}>
                    {pro.name}
                  </option>
                ),
              )}
            </select>
          </label>
          <button
            type="submit"
            className="rounded border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black"
          >
            Atualizar
          </button>
        </form>

        <AdminClient
          appointments={viewAppointments}
          professionals={(professionals ?? []) as ProfessionalRow[]}
          selectedDate={selectedDate}
        />
      </div>
    </main>
  );
}
