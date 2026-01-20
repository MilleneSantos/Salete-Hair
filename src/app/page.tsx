"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";

const services = [
  { name: "Escova", duration: "45 min" },
  { name: "Manicure e Pedicure", duration: "60 min" },
  { name: "Progressiva", duration: "120 min" },
  { name: "Tratamento Capilar", duration: "30 min" },
];

const professionals = [
  {
    name: "Priscila",
    role: "Especialista em escovas",
    avatarClass: "avatar--gold",
    initials: "P",
  },
  {
    name: "Ines",
    role: "Manicure e cabeleireira",
    avatarClass: "avatar--rose",
    initials: "I",
  },
  {
    name: "Salete",
    role: "Especialista em tratamentos",
    avatarClass: "avatar--bronze",
    initials: "S",
  },
];

const timeSlots = ["09:00", "09:45", "10:30", "13:00", "13:30", "14:15", "15:00"];
const selectedTime = "13:30";

const screenDelay = (delay: string) => ({ "--delay": delay } as CSSProperties);

function ScreenTop() {
  return (
    <div className="screen__top">
      <button type="button" className="icon-button" aria-label="Voltar">
        <span className="icon-arrow" aria-hidden="true" />
      </button>
      <span>Salete Santos</span>
    </div>
  );
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowSplash(false), 2400);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <div className="app-shell">
      {showSplash && (
        <div className="splash" role="status" aria-live="polite">
          <Image
            src="/imagens/salete-logo.png"
            alt="Salete Santos"
            width={220}
            height={220}
            priority
            className="splash__logo"
          />
        </div>
      )}

      <main className="showcase">
        <section className="showcase__intro">
          <span className="eyebrow">Sistema Salete</span>
          <h1 className="showcase__title">Agendamentos premium para o seu espaco.</h1>
          <p className="showcase__lead">
            Um fluxo elegante para escolher servico, profissional e horario, com
            confirmacao clara e contato imediato.
          </p>
        </section>

        <section className="showcase__screens">
          <article className="screen" style={screenDelay("0s")}>
            <ScreenTop />
            <div>
              <h2 className="screen__title">Agendamento</h2>
              <p className="screen__subtitle">Escolha um servico</p>
            </div>
            <div className="list">
              {services.map((service) => (
                <button type="button" className="list-item" key={service.name}>
                  <div>
                    <div>{service.name}</div>
                    <div className="list-item__meta">{service.duration}</div>
                  </div>
                  <span className="chevron" aria-hidden="true" />
                </button>
              ))}
            </div>
          </article>

          <article className="screen" style={screenDelay("0.12s")}>
            <ScreenTop />
            <div>
              <h2 className="screen__title">Selecione uma profissional</h2>
              <p className="screen__subtitle">Escolha a profissional para &quot;Escova&quot;</p>
            </div>
            <div className="list">
              {professionals.map((pro) => (
                <button type="button" className="list-item" key={pro.name}>
                  <div className="profile">
                    <div className={`avatar ${pro.avatarClass}`} aria-hidden="true">
                      {pro.initials}
                    </div>
                    <div>
                      <div>{pro.name}</div>
                      <div className="list-item__meta">{pro.role}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </article>

          <article className="screen" style={screenDelay("0.24s")}>
            <ScreenTop />
            <div>
              <h2 className="screen__title">Escolher horario</h2>
              <p className="screen__subtitle">
                Escolha o horario para fazer &quot;Escova&quot; com Priscila em 25/04
              </p>
            </div>
            <div className="date-pill">
              <span>quinta-feira, 25 abril</span>
              <span className="chevron" aria-hidden="true" />
            </div>
            <div className="time-grid">
              {timeSlots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={`chip ${slot === selectedTime ? "chip--active" : ""}`}
                >
                  {slot}
                </button>
              ))}
            </div>
            <button type="button" className="cta">
              Confirmar agendamento
            </button>
          </article>

          <article className="screen screen--sparkle" style={screenDelay("0.36s")}>
            <ScreenTop />
            <div>
              <h2 className="screen__title">Agendamento confirmado!</h2>
            </div>
            <p className="muted">
              Voce agendou <strong>Escova</strong> com <strong>Priscila</strong> em
              quinta-feira, 25 abril as 10:30.
            </p>
            <p className="muted">Fique de olho no email para confirmar o atendimento.</p>
            <button type="button" className="cta cta--whatsapp">
              <span className="cta__icon" aria-hidden="true">
                W
              </span>
              Chamar no WhatsApp
            </button>
            <p className="list-item__meta">
              Para ajustes no horario, entre em contato com a equipe.
            </p>
          </article>
        </section>
      </main>
    </div>
  );
}
