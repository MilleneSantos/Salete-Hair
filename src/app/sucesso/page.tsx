import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { formatLongDate, formatTime } from "@/lib/datetime";
import { Screen } from "@/components/Screen";

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
        <Link href="/" className="text-sm text-[#D4AF37]">
          Voltar ao inicio
        </Link>
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

  const [{ data: service }, { data: professional }] = await Promise.all([
    appointment?.service_id
      ? supabase
          .from("services")
          .select("id,name")
          .eq("id", appointment.service_id)
          .maybeSingle<ServiceRow>()
      : Promise.resolve({ data: null }),
    appointment?.professional_id
      ? supabase
          .from("professionals")
          .select("id,name")
          .eq("id", appointment.professional_id)
          .maybeSingle<ProfessionalRow>()
      : Promise.resolve({ data: null }),
  ]);

  const startDate = appointment?.starts_at
    ? new Date(appointment.starts_at)
    : null;
  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ??
    process.env.WHATSAPP_NUMBER ??
    "";
  const whatsappMessage = startDate
    ? `Oi! Gostaria de confirmar meu horario para ${
        service?.name ?? "servico"
      } com ${professional?.name ?? "profissional"} em ${formatLongDate(
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

      <div className="rounded border border-[#D4AF37]/60 px-4 py-3">
        <div className="text-sm text-white/70">Servico</div>
        <div className="text-base">{service?.name ?? "-"}</div>
        <div className="mt-3 text-sm text-white/70">Profissional</div>
        <div className="text-base">{professional?.name ?? "-"}</div>
        <div className="mt-3 text-sm text-white/70">Data e horario</div>
        <div className="text-base">
          {startDate
            ? `${formatLongDate(startDate)} as ${formatTime(startDate)}`
            : "-"}
        </div>
      </div>

      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded border border-[#D4AF37] bg-[#D4AF37] px-4 py-3 text-center text-sm font-semibold text-black"
        >
          Chamar no WhatsApp
        </a>
      ) : (
        <p className="text-sm text-white/70">
          Configure o numero do WhatsApp para habilitar o contato rapido.
        </p>
      )}

      <Link href="/" className="text-center text-sm text-[#D4AF37]">
        Fazer novo agendamento
      </Link>
    </Screen>
  );
}
