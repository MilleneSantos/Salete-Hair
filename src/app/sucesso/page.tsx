import { supabase } from "@/lib/supabase";
import { formatLongDate, formatTime } from "@/lib/datetime";
import { Screen } from "@/components/Screen";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

type AppointmentRow = {
  id: string;
  client_name?: string | null;
  client_phone?: string | null;
  client_email?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  service_id?: string | null;
  professional_id?: string | null;
};

type AppointmentServiceRow = {
  appointment_id?: string | null;
  service_id?: string | null;
  professional_id?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  order_index?: number | null;
};

type ServiceRow = {
  id: string;
  name?: string | null;
};

type ProfessionalRow = {
  id: string;
  name?: string | null;
};

export default async function SucessoPage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const appointmentId = searchParams.id;

  if (!appointmentId) {
    return (
      <Screen>
        <Button href="/" variant="ghost">
          Voltar ao inicio
        </Button>
        <p className="text-sm text-white/70">Agendamento nao encontrado.</p>
      </Screen>
    );
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select(
      "id,client_name,client_phone,client_email,starts_at,ends_at,service_id,professional_id",
    )
    .eq("id", appointmentId)
    .maybeSingle<AppointmentRow>();

  const { data: appointmentServices } = await supabase
    .from("appointment_services")
    .select("appointment_id,service_id,professional_id,starts_at,ends_at,order_index")
    .eq("appointment_id", appointmentId)
    .order("order_index", { ascending: true });

  const appointmentServiceIds =
    appointmentServices?.map((item) => item.service_id).filter(Boolean) ?? [];
  const appointmentProfessionalIds =
    appointmentServices?.map((item) => item.professional_id).filter(Boolean) ?? [];

  const [{ data: services }, { data: professionals }] = await Promise.all([
    appointmentServiceIds.length
      ? supabase
          .from("services")
          .select("id,name")
          .in("id", appointmentServiceIds)
      : appointment?.service_id
        ? supabase
            .from("services")
            .select("id,name")
            .eq("id", appointment.service_id)
        : Promise.resolve({ data: [] }),
    appointmentProfessionalIds.length
      ? supabase
          .from("professionals")
          .select("id,name")
          .in("id", appointmentProfessionalIds)
      : appointment?.professional_id
        ? supabase
            .from("professionals")
            .select("id,name")
            .eq("id", appointment.professional_id)
        : Promise.resolve({ data: [] }),
  ]);

  const serviceMap = new Map(
    (services as ServiceRow[] | null | undefined)?.map((service) => [
      service.id,
      service.name ?? "",
    ]) ?? [],
  );
  const professionalMap = new Map(
    (professionals as ProfessionalRow[] | null | undefined)?.map((pro) => [
      pro.id,
      pro.name ?? "",
    ]) ?? [],
  );

  const steps =
    appointmentServices?.length
      ? (appointmentServices as AppointmentServiceRow[]).map((item) => ({
          service_id: item.service_id ?? "",
          professional_id: item.professional_id ?? "",
          starts_at: item.starts_at ? new Date(item.starts_at) : null,
          ends_at: item.ends_at ? new Date(item.ends_at) : null,
        }))
      : [];

  const fallbackServiceName = appointment?.service_id
    ? serviceMap.get(appointment.service_id)
    : "";
  const fallbackProfessionalName = appointment?.professional_id
    ? professionalMap.get(appointment.professional_id)
    : "";

  const startDate = appointment?.starts_at
    ? new Date(appointment.starts_at)
    : null;
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
    process.env.WHATSAPP_NUMBER ??
    "";
  const servicesText = steps.length
    ? steps
        .map((step) => {
          const serviceName = step.service_id
            ? serviceMap.get(step.service_id) ?? "servico"
            : "servico";
          const professionalName = step.professional_id
            ? professionalMap.get(step.professional_id) ?? "profissional"
            : "profissional";
          return `${serviceName} (${professionalName})`;
        })
        .join(", ")
    : `${fallbackServiceName || "servico"} (${fallbackProfessionalName || "profissional"})`;

  const whatsappMessage = startDate
    ? `Oi! Gostaria de confirmar meu horario para ${servicesText} em ${formatLongDate(
        startDate,
      )} as ${formatTime(startDate)}.`
    : "Oi! Gostaria de confirmar meu agendamento.";
  const whatsappHref = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
        whatsappMessage,
      )}`
    : null;

  return (
    <Screen>
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-[#D4AF37]">
          Agendamento confirmado
        </h1>
        <p className="text-sm text-white/70">
          Obrigado{appointment?.client_name ? `, ${appointment.client_name}` : ""}!
        </p>
      </header>

      <div className="rounded-2xl border border-[#D4AF37]/60 px-4 py-4">
        <div className="text-sm text-white/70">Resumo do agendamento</div>
        {steps.length ? (
          <div className="mt-3 flex flex-col gap-3 text-sm">
            {steps.map((step, index) => {
              const startLabel =
                step.starts_at && step.ends_at
                  ? `${formatTime(step.starts_at)}–${formatTime(step.ends_at)}`
                  : "--:--";
              const serviceName = step.service_id
                ? serviceMap.get(step.service_id) ?? "Servico"
                : "Servico";
              const professionalName = step.professional_id
                ? professionalMap.get(step.professional_id) ?? "Profissional"
                : "Profissional";
              return (
                <div key={`${step.service_id}-${index}`}>
                  <div className="text-white">
                    {startLabel} {serviceName}
                  </div>
                  <div className="text-white/60">{professionalName}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <>
            <div className="mt-3 text-base">{fallbackServiceName || "-"}</div>
            <div className="mt-3 text-sm text-white/70">Profissional</div>
            <div className="text-base">{fallbackProfessionalName || "-"}</div>
          </>
        )}
        <div className="mt-3 text-sm text-white/70">Data e horario</div>
        <div className="text-base">
          {startDate
            ? `${formatLongDate(startDate)} as ${formatTime(startDate)}`
            : "-"}
        </div>
      </div>

      {whatsappHref ? (
        <Button
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          variant="primary"
          size="lg"
          fullWidth
        >
          Chamar no WhatsApp
        </Button>
      ) : (
        <p className="text-sm text-white/70">
          Configure o numero do WhatsApp para habilitar o contato rapido.
        </p>
      )}

      <Button href="/" variant="ghost" fullWidth>
        Fazer novo agendamento
      </Button>
    </Screen>
  );
}
