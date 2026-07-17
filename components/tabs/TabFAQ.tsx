"use client";

import { useState } from "react";

/**
 * Tab "¿Cómo funciona?" — FAQ explicativo del sistema de alertas de incendios.
 *
 * Explica:
 *  - Satélites que se consultan (VIIRS S-NPP, VIIRS NOAA-20, MODIS Terra/Aqua)
 *  - Frecuencia de actualización de datos FIRMS
 *  - Qué es la confianza de un foco (nominal / alta / baja)
 *  - Qué es la temperatura de brillo (bright_ti4)
 *  - Cómo funcionan las alertas y las suscripciones
 */

interface FaqItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
}

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "satellites",
    question: "¿Qué satélites utiliza el sistema?",
    answer: (
      <div className="space-y-3">
        <p>
          El sistema consulta datos del programa{" "}
          <strong className="text-textPrimary">NASA FIRMS</strong> (Fire
          Information for Resource Management System), que integra datos de
          múltiples sensores:
        </p>
        <ul className="space-y-2 pl-1">
          {[
            [
              "🛰️ VIIRS S-NPP (Suomi NPP)",
              "Sensor VIIRS a bordo del satélite Suomi NPP. Órbita polar, resolución de 375 m. Fuente principal del sistema.",
            ],
            [
              "🛰️ VIIRS NOAA-20 (J-1)",
              "Idéntico al anterior pero en el satélite NOAA-20. Cubre la misma órbita con un desfase de ~50 minutos, duplicando la frecuencia de revisita.",
            ],
            [
              "🔴 MODIS Terra y Aqua",
              "Sensores históricos con resolución de 1 km. Se usan para análisis de historial extendido. No son la fuente primaria de alertas en tiempo real.",
            ],
          ].map(([title, desc]) => (
            <li
              key={String(title)}
              className="rounded-lg border border-border bg-base p-3"
            >
              <div className="mb-1 text-sm font-semibold text-textPrimary">
                {title}
              </div>
              <div className="text-xs leading-relaxed text-textSecondary">
                {desc}
              </div>
            </li>
          ))}
        </ul>
      </div>
    ),
  },
  {
    id: "update-frequency",
    question: "¿Cada cuánto tiempo se actualizan los datos?",
    answer: (
      <div className="space-y-2">
        <p>
          Los satélites de órbita polar realizan{" "}
          <strong className="text-textPrimary">
            una pasada por España cada ~3 horas
          </strong>
          . VIIRS S-NPP y NOAA-20 juntos proporcionan cobertura aproximadamente
          cada 90 minutos, aunque la ventana exacta varía según la latitud y la
          inclinación orbital.
        </p>
        <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-4 py-3">
          <p className="text-xs leading-relaxed text-amber-400/90">
            ⚠️ Los datos de Tiempo Real NRT (Near Real-Time) tienen un retraso
            de entre 1 y 3 horas desde la adquisición hasta su disponibilidad en
            FIRMS. Esto significa que un incendio detectado a las 14:00 UTC
            podría no aparecer en el sistema hasta las 17:00 UTC.
          </p>
        </div>
        <p className="text-sm text-textSecondary">
          El sistema evalúa las alertas cada 15 minutos mediante un proceso
          automático (cron de Supabase). En cuanto aparecen nuevos focos en
          FIRMS, los suscriptores reciben el email.
        </p>
      </div>
    ),
  },
  {
    id: "confidence",
    question: "¿Qué es la confianza de un foco? ¿Qué diferencia hay entre nominal y alta?",
    answer: (
      <div className="space-y-3">
        <p>
          El algoritmo de detección de VIIRS asigna a cada píxel de fuego una
          <strong className="text-textPrimary"> confianza</strong> que indica la
          probabilidad estadística de que realmente sea un incendio activo y no
          una falsa alarma (reflejo solar, superficie caliente, etc.).
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            {
              level: "Alta",
              emoji: "🔴",
              color: "text-red-400",
              border: "border-red-400/30",
              bg: "bg-red-400/5",
              desc: "Probabilidad muy elevada (>80%) de incendio activo. Alta temperatura de brillo y coherencia espacial con píxeles vecinos.",
            },
            {
              level: "Nominal",
              emoji: "🟠",
              color: "text-orange-400",
              border: "border-orange-400/30",
              bg: "bg-orange-400/5",
              desc: "Probabilidad moderada-alta (30–80%). El píxel cumple los criterios básicos pero con menor certeza que \"Alta\".",
            },
            {
              level: "Baja",
              emoji: "🟡",
              color: "text-yellow-400",
              border: "border-yellow-400/30",
              bg: "bg-yellow-400/5",
              desc: "Probabilidad baja (<30%). Podría ser un incendio o podría ser ruido. Se muestra en el mapa pero no se usa para alertas por defecto.",
            },
          ].map(({ level, emoji, color, border, bg, desc }) => (
            <div
              key={level}
              className={`rounded-lg border ${border} ${bg} p-3`}
            >
              <div className={`mb-1 text-sm font-bold ${color}`}>
                {emoji} {level}
              </div>
              <div className="text-xs leading-relaxed text-textSecondary">
                {desc}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-textSecondary">
          En la configuración de suscripciones puedes elegir recibir solo
          alertas con confianza <strong>Nominal</strong> o únicamente{" "}
          <strong>Alta</strong> para reducir falsas alarmas.
        </p>
      </div>
    ),
  },
  {
    id: "brightness",
    question: "¿Qué es la temperatura de brillo (bright_ti4)?",
    answer: (
      <div className="space-y-2">
        <p>
          La <strong className="text-textPrimary">temperatura de brillo</strong>{" "}
          (campo <code className="rounded bg-base px-1 text-fire">bright_ti4</code> en VIIRS) es la temperatura
          radiométrica medida en el canal infrarrojo de onda media del sensor
          (banda I4, ~3,74 µm), expresada en{" "}
          <strong className="text-textPrimary">grados Kelvin (K)</strong>.
        </p>
        <div className="rounded-lg border border-border bg-base px-4 py-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-textSecondary">
            Valores de referencia
          </p>
          <ul className="space-y-1.5">
            {[
              ["< 300 K", "Sin anomalía térmica"],
              ["300–340 K", "Actividad térmica leve (suelo caliente, industria)"],
              ["340–380 K", "Incendio probable o activo de intensidad media"],
              ["> 380 K", "Incendio de alta intensidad"],
              ["> 400 K", "Gran incendio forestal o industrial"],
            ].map(([range, label]) => (
              <li key={range} className="flex items-center gap-3 text-xs">
                <span className="w-24 shrink-0 font-mono text-fire">
                  {range}
                </span>
                <span className="text-textSecondary">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-textSecondary">
          En la configuración de alertas puedes establecer una{" "}
          <strong>temperatura mínima</strong> (ej. 340 K) para recibir solo
          alertas de focos con alta intensidad térmica.
        </p>
      </div>
    ),
  },
  {
    id: "how-alerts-work",
    question: "¿Cómo funciona el flujo de alertas?",
    answer: (
      <div className="space-y-3">
        <ol className="space-y-3">
          {[
            [
              "1",
              "Detección satelital",
              "Los satélites VIIRS escanean el territorio cada ~3 horas. Si detectan un pixel con anomalía térmica significativa, lo registran con coordenadas, confianza, brillo y tiempo de adquisición.",
            ],
            [
              "2",
              "Publicación en FIRMS",
              "NASA publica los datos en formato CSV en la API FIRMS en Tiempo Real (NRT). El retraso típico es de 1 a 3 horas.",
            ],
            [
              "3",
              "Evaluación del sistema",
              "Cada 15 minutos, el cron de Supabase descarga los datos de FIRMS, los filtra por España, asigna cada foco a su provincia, y cruza con la lista de suscripciones activas y confirmadas.",
            ],
            [
              "4",
              "Filtrado personalizado",
              "Cada suscripción tiene su propia configuración de confianza mínima y temperatura de brillo mínima. Solo se genera alerta si el foco supera los umbrales del suscriptor.",
            ],
            [
              "5",
              "Email de alerta",
              "Si el foco no ha sido enviado antes (deduplicación por ID), se envía un email de resumen al suscriptor con los detalles del foco.",
            ],
          ].map(([num, title, desc]) => (
            <li key={num} className="flex gap-4">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fire/10 text-xs font-bold text-fire">
                {num}
              </div>
              <div>
                <div className="mb-0.5 text-sm font-semibold text-textPrimary">
                  {title}
                </div>
                <div className="text-xs leading-relaxed text-textSecondary">
                  {desc}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: "subscription",
    question: "¿Quién puede suscribirse?",
    answer: (
      <p className="text-sm leading-relaxed text-textSecondary">
        Las suscripciones y el panel de alertas están disponibles{" "}
        <strong className="text-textPrimary">
          únicamente para usuarios registrados con correo institucional
          @digital.gob.es
        </strong>
        . Si eres usuario JPIT, puedes crear una cuenta desde la sección{" "}
        <strong>Mi cuenta</strong> → <em>Crear cuenta</em>. Tras el registro
        recibirás un email de confirmación; una vez confirmada la cuenta podrás
        activar alertas para cualquier provincia española.
      </p>
    ),
  },
  {
    id: "data-source",
    question: "¿Son datos en tiempo real? ¿Pueden producirse falsas alarmas?",
    answer: (
      <div className="space-y-2">
        <p className="text-sm leading-relaxed text-textSecondary">
          Los datos son <strong className="text-textPrimary">Tiempo Real NRT</strong>,
          con un retardo inherente de 1–3 horas. No son datos instantáneos.
        </p>
        <p className="text-sm leading-relaxed text-textSecondary">
          Sí pueden producirse{" "}
          <strong className="text-textPrimary">falsas alarmas</strong>. Fuentes
          habituales de error:
        </p>
        <ul className="space-y-1 text-xs text-textSecondary">
          {[
            "Reflexiones solares intensas sobre superficies metálicas o agua.",
            "Actividad volcánica (especialmente en Canarias).",
            "Instalaciones industriales con alta emisión térmica.",
            "Gases en combustión en instalaciones petroquímicas.",
          ].map((item) => (
            <li key={item} className="flex items-start gap-2">
              <span className="mt-0.5 text-fire">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <div className="rounded-lg border border-red-400/20 bg-red-400/5 px-4 py-3">
          <p className="text-xs font-semibold text-red-400">
            ⚠️ Este sistema es una herramienta de monitorización. En caso de
            emergencia, llama siempre al <strong>112</strong>.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: "privacy",
    question: "¿Cómo se tratan mis datos?",
    answer: (
      <p className="text-sm leading-relaxed text-textSecondary">
        El sistema almacena únicamente tu{" "}
        <strong className="text-textPrimary">correo institucional</strong> y las
        provincias a las que te has suscrito. Los datos se guardan en Supabase
        (infraestructura europea). No se comparten con terceros. Puedes cancelar
        cualquier suscripción en cualquier momento desde el enlace que figura en
        cada email de alerta o desde el panel «Mis alertas».
      </p>
    ),
  },
];

export default function TabFAQ() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl animate-fade-in p-6 h-full overflow-y-auto">
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-fire/10 text-2xl">
            📡
          </div>
          <div>
            <h1 className="mb-1 text-xl font-bold text-textPrimary">
              ¿Cómo funciona el sistema?
            </h1>
            <p className="text-sm leading-relaxed text-textSecondary">
              Preguntas frecuentes sobre el sistema de monitorización de
              incendios JPIT — satélites, datos NASA FIRMS, confianza de focos y
              temperatura de brillo.
            </p>
          </div>
        </div>

        {/* Stats rápidos */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["🛰️", "4", "Satélites monitorizados"],
            ["⏱️", "~3h", "Frecuencia de pasada"],
            ["📍", "375 m", "Resolución VIIRS"],
            ["⚡", "15 min", "Ciclo de evaluación"],
          ].map(([icon, value, label]) => (
            <div
              key={label}
              className="rounded-xl border border-border bg-base p-3 text-center"
            >
              <div className="mb-1 text-lg">{icon}</div>
              <div className="text-base font-bold text-fire">{value}</div>
              <div className="text-xs text-textSecondary">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-2">
        {FAQ_ITEMS.map((item) => {
          const isOpen = openId === item.id;
          return (
            <div
              key={item.id}
              className="overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-fire/30"
            >
              <button
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                id={`faq-${item.id}`}
                aria-expanded={isOpen}
              >
                <span className="text-sm font-semibold text-textPrimary">
                  {item.question}
                </span>
                <span
                  className={`shrink-0 text-fire transition-transform duration-200 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ▾
                </span>
              </button>
              {isOpen && (
                <div className="animate-fade-in border-t border-border px-5 py-4 text-sm text-textSecondary">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fuente */}
      <div className="mt-6 rounded-xl border border-border bg-surface px-5 py-4">
        <p className="text-xs leading-relaxed text-textSecondary">
          <strong className="text-textPrimary">Fuente de datos:</strong> NASA
          FIRMS (Fire Information for Resource Management System) ·{" "}
          <a
            href="https://firms.modaps.eosdis.nasa.gov"
            target="_blank"
            rel="noopener noreferrer"
            className="text-fire hover:underline"
          >
            firms.modaps.eosdis.nasa.gov
          </a>{" "}
          · Sensor VIIRS S-NPP NRT · Datos de uso libre bajo política NASA Open
          Data.
        </p>
      </div>
    </div>
  );
}
