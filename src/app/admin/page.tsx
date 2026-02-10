import { supabase } from "@/lib/supabase";
import { formatDateKey, formatLongDate } from "@/lib/datetime";
import { AdminClient } from "@/components/admin-client";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

type ServiceRow = {
  id: string;
  name?: string | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

type AppointmentServiceRow = {
  appointment_id?: string | null;
  service_id?: string | null;
  professional_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  order_index?: number | null;
  services?: { name?: string | null } | null;
  professionals?: { name?: string | null } | null;
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

  const appointmentsQuery = supabase
    .from("appointments")
    .select(
      "id,client_name,client_phone,starts_at,ends_at,status,service_id,professional_id,appointment_services(service_id,professional_id,starts_at,ends_at,order_index,services(name),professionals(name))",
    )
    .lt("starts_at", dayEnd)
    .gt("ends_at", dayStart)
    .order("starts_at", { ascending: true });

  const [{ data: appointments }, { data: professionals }] = await Promise.all([
    appointmentsQuery,
    supabase.from("professionals").select("id,name").order("name"),
  ]);

  const serviceIds =
    appointments?.map((item) => item.service_id).filter(Boolean) ?? [];
  const professionalIds =
    appointments?.map((item) => item.professional_id).filter(Boolean) ?? [];
  const itemServiceIds =
    appointments
      ?.flatMap((appointment) => appointment.appointment_services ?? [])
      .map((item) => item.service_id)
      .filter(Boolean) ?? [];
  const itemProfessionalIds =
    appointments
      ?.flatMap((appointment) => appointment.appointment_services ?? [])
      .map((item) => item.professional_id)
      .filter(Boolean) ?? [];
  const allServiceIds = [...new Set([...serviceIds, ...itemServiceIds])];
  const allProfessionalIds = [
    ...new Set([...professionalIds, ...itemProfessionalIds]),
  ];

  const [{ data: services }, { data: appointmentPros }] = await Promise.all([
    allServiceIds.length
      ? supabase.from("services").select("id,name").in("id", allServiceIds)
      : Promise.resolve({ data: [] }),
    allProfessionalIds.length
      ? supabase
          .from("professionals")
          .select("id,name")
          .in("id", allProfessionalIds)
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

  const viewAppointments = (appointments ?? [])
    .map((appointment) => {
      const items =
        (appointment.appointment_services as AppointmentServiceRow[] | null | undefined) ??
        [];
      const mappedItems = items.map((item) => ({
        service_id: item.service_id ?? "",
        professional_id: item.professional_id ?? "",
        starts_at: item.starts_at ?? null,
        ends_at: item.ends_at ?? null,
        service_name:
          item.services?.name ??
          (item.service_id ? serviceMap.get(item.service_id) ?? "" : ""),
        professional_name:
          item.professionals?.name ??
          (item.professional_id
            ? professionalMap.get(item.professional_id) ?? ""
            : ""),
      }));

      return {
        ...appointment,
        service_name: appointment.service_id
          ? serviceMap.get(appointment.service_id) ?? ""
          : "",
        professional_name: appointment.professional_id
          ? professionalMap.get(appointment.professional_id) ?? ""
          : "",
        items: mappedItems,
      };
    })
    .filter((appointment) => {
      if (selectedProfessional === "all") {
        return true;
      }
      if (appointment.professional_id === selectedProfessional) {
        return true;
      }
      return appointment.items?.some(
        (item: { professional_id?: string }) =>
          item.professional_id === selectedProfessional,
      );
    });

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <Button href="/" variant="ghost">
          Voltar
        </Button>
        <h1 className="text-2xl font-semibold">Painel do salao</h1>
        <p className="text-sm text-white/70">
          {formatLongDate(new Date(`${selectedDate}T00:00:00-03:00`))}
        </p>
      </header>

      <form className="grid gap-3" method="GET">
        <label className="flex flex-col gap-2 text-xs">
          Dia
          <input
            className="min-h-[44px] rounded-2xl border border-[#D4AF37]/60 bg-black px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
            type="date"
            name="day"
            defaultValue={selectedDate}
          />
        </label>
        <label className="flex flex-col gap-2 text-xs">
          Visualizacao
          <select
            className="min-h-[44px] rounded-2xl border border-[#D4AF37]/60 bg-black px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#D4AF37]"
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
        <Button type="submit" variant="secondary" size="lg" fullWidth>
          Atualizar
        </Button>
      </form>

      <AdminClient
        appointments={viewAppointments}
        professionals={(professionals ?? []) as ProfessionalRow[]}
        selectedDate={selectedDate}
      />
    </Screen>
  );
}
