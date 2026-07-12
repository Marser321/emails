import type { BlockConfig, CanvasBlockType, EmailContent, TemplatePreset, TemplatePresetId, TemplateType } from './types';

type ObjectiveCopy = {
  label: string;
  headline: string;
  body: string;
  bulletsTitle: string;
  bullets: string[];
  ctaText: string;
  preCta: string;
  footerNote: string;
  eventDate?: string;
  eventTime?: string;
};

const COPY: Record<TemplateType, ObjectiveCopy> = {
  masterclass: {
    label: 'Masterclass en vivo', headline: 'Convierte una buena estrategia en resultados medibles',
    body: 'Una sesión práctica para ordenar tus prioridades, detectar oportunidades y salir con un plan que puedas aplicar esta semana.',
    bulletsTitle: 'Lo que vas a trabajar', bullets: ['Una propuesta más clara', 'Un sistema de captación repetible', 'Próximos pasos con foco'],
    ctaText: 'Reservar mi lugar', preCta: 'El acceso se envía al completar el registro.', footerNote: 'Cupos limitados',
    eventDate: '18 de julio', eventTime: '11:00 a. m. ET',
  },
  registration: {
    label: 'Registro confirmado', headline: 'Tu lugar ya está reservado',
    body: 'Guardamos tus datos correctamente. A continuación encontrarás todo lo necesario para llegar preparado.',
    bulletsTitle: 'Antes de comenzar', bullets: ['Guarda este correo', 'Añade la fecha a tu calendario', 'Ten tus preguntas a mano'],
    ctaText: 'Ver mis datos de acceso', preCta: 'Puedes volver a esta información cuando la necesites.', footerNote: 'Gracias por registrarte',
  },
  followup: {
    label: 'Seguimiento', headline: 'Retomemos lo que conversamos',
    body: 'Preparamos un resumen breve con las decisiones y acciones que pueden generar mayor impacto en este momento.',
    bulletsTitle: 'Próximos pasos', bullets: ['Confirmar prioridades', 'Asignar responsables', 'Revisar avances en siete días'],
    ctaText: 'Agendar la próxima conversación', preCta: 'Elige el horario que mejor te funcione.', footerNote: 'Responde este correo si necesitas ajustar algo',
  },
  promo: {
    label: 'Oferta privada', headline: 'Una oportunidad concreta para avanzar hoy',
    body: 'Accede a condiciones especiales por tiempo limitado, con todo lo necesario para empezar sin fricción.',
    bulletsTitle: 'Incluye', bullets: ['Implementación inicial', 'Acompañamiento especializado', 'Recursos listos para usar'],
    ctaText: 'Ver la oferta', preCta: 'La disponibilidad termina pronto.', footerNote: 'Aplican términos y condiciones',
  },
  reminder: {
    label: 'Recordatorio', headline: 'Tu cita está cerca',
    body: 'Te esperamos. Revisa la fecha y el horario para que puedas conectarte con unos minutos de anticipación.',
    bulletsTitle: 'Para llegar preparado', bullets: ['Confirma tu asistencia', 'Comprueba tu conexión', 'Ten tus preguntas a mano'],
    ctaText: 'Confirmar asistencia', preCta: 'Solo toma unos segundos.', footerNote: 'Si necesitas reprogramar, responde este correo',
    eventDate: 'Mañana, 18 de julio', eventTime: '11:00 a. m. ET',
  },
  newsletter: {
    label: 'Notas de crecimiento · 07', headline: 'Ideas que vale la pena aplicar este mes',
    body: 'Una selección breve de aprendizajes, señales y recursos para tomar mejores decisiones de marketing.',
    bulletsTitle: 'En esta edición', bullets: ['Qué está cambiando en adquisición', 'Cómo leer mejor tus métricas', 'Una referencia visual para guardar'],
    ctaText: 'Leer la edición completa', preCta: 'Cinco minutos de lectura.', footerNote: 'Recibes este correo por ser parte de nuestra comunidad',
  },
  sales: {
    label: 'Selección destacada', headline: 'Diseñado para resolver lo importante',
    body: 'Una solución clara, bien acompañada y lista para incorporarse a tu operación sin sumar complejidad innecesaria.',
    bulletsTitle: 'Por qué elegirlo', bullets: ['Configuración rápida', 'Soporte humano', 'Resultados fáciles de medir'],
    ctaText: 'Conocer la propuesta', preCta: 'Consulta disponibilidad y condiciones.', footerNote: 'Garantía de satisfacción de 30 días',
  },
  financial_advisory: {
    label: 'Informe financiero', headline: 'Decisiones más claras para el próximo trimestre',
    body: 'Reunimos las señales principales del mercado y los puntos que conviene revisar en tu estrategia financiera.',
    bulletsTitle: 'Puntos de atención', bullets: ['Distribución de riesgo', 'Liquidez disponible', 'Objetivos de corto plazo'],
    ctaText: 'Agendar una revisión', preCta: 'Revisa tu estrategia con un especialista.', footerNote: 'Esta información no constituye asesoramiento fiscal',
  },
  onboarding: {
    label: 'Bienvenido', headline: 'Empecemos con una base clara',
    body: 'Tu espacio ya está listo. Completa estos primeros pasos para que podamos adaptar la experiencia a tus objetivos.',
    bulletsTitle: 'Tu ruta de inicio', bullets: ['Completa tu perfil', 'Define tus preferencias', 'Agenda tu sesión inicial'],
    ctaText: 'Completar mi perfil', preCta: 'Puedes terminarlo en menos de cinco minutos.', footerNote: 'Nuestro equipo está disponible para ayudarte',
  },
};

const PRESET_META: Array<[TemplatePresetId, TemplateType, string, string, 'editorial' | 'structured']> = [
  ['keynote', 'masterclass', 'Keynote', 'Invitación editorial con foco en la promesa principal.', 'editorial'],
  ['workshop', 'masterclass', 'Workshop', 'Agenda práctica con información del evento en primer plano.', 'structured'],
  ['confirmation', 'registration', 'Confirmación', 'Confirmación sobria con recorrido de próximos pasos.', 'editorial'],
  ['access-pass', 'registration', 'Access pass', 'Acceso destacado y datos esenciales en formato compacto.', 'structured'],
  ['personal-note', 'followup', 'Nota personal', 'Seguimiento conversacional, simple y cercano.', 'editorial'],
  ['next-steps', 'followup', 'Próximos pasos', 'Plan de acción ordenado para continuar el proceso.', 'structured'],
  ['offer-focus', 'promo', 'Oferta central', 'Una propuesta dominante con CTA inmediato.', 'editorial'],
  ['promo-grid', 'promo', 'Promo grid', 'Beneficios y condiciones organizados en módulos.', 'structured'],
  ['countdown', 'reminder', 'Cuenta regresiva', 'Recordatorio corto con urgencia y fecha protagonista.', 'editorial'],
  ['calendar-card', 'reminder', 'Tarjeta de calendario', 'Información del evento estructurada para consulta rápida.', 'structured'],
  ['editorial-digest', 'newsletter', 'Digest editorial', 'Lectura pausada con jerarquía de publicación.', 'editorial'],
  ['visual-roundup', 'newsletter', 'Resumen visual', 'Secciones modulares para novedades y recursos.', 'structured'],
  ['product-story', 'sales', 'Historia de producto', 'Narrativa de valor antes de presentar la acción.', 'editorial'],
  ['single-offer', 'sales', 'Oferta única', 'Propuesta comercial directa y compacta.', 'structured'],
  ['market-brief', 'financial_advisory', 'Market brief', 'Resumen ejecutivo con tono financiero editorial.', 'editorial'],
  ['portfolio-review', 'financial_advisory', 'Revisión de portafolio', 'Puntos de análisis y cita organizados por prioridad.', 'structured'],
  ['welcome-path', 'onboarding', 'Ruta de bienvenida', 'Introducción cálida con una secuencia clara.', 'editorial'],
  ['getting-started', 'onboarding', 'Primeros pasos', 'Checklist de activación para nuevos clientes.', 'structured'],
];

function blocksFor(id: TemplatePresetId, objective: TemplateType, mode: 'editorial' | 'structured'): BlockConfig[] {
  const copy = COPY[objective];
  const text = {
    id: `${id}-text`, type: 'text' as const, label: copy.label, headline: copy.headline, body: copy.body,
    style: mode === 'editorial'
      ? { paddingTop: 38, paddingRight: 40, paddingBottom: 18, paddingLeft: 40, heading: { fontSize: 32, lineHeight: 1.12 }, text: { fontSize: 16, lineHeight: 1.7 } }
      : { paddingTop: 26, paddingRight: 32, paddingBottom: 12, paddingLeft: 32, heading: { fontSize: 27, lineHeight: 1.2 }, text: { fontSize: 15, lineHeight: 1.6 } },
  };
  const bullets = { id: `${id}-bullets`, type: 'bullets' as const, bulletsTitle: copy.bulletsTitle, bullets: copy.bullets };
  const cta = { id: `${id}-cta`, type: 'cta' as const, ctaText: copy.ctaText, ctaUrl: 'https://example.com', preCta: copy.preCta };
  const info = copy.eventDate || copy.eventTime
    ? [{ id: `${id}-info`, type: 'infobox' as const, eventDate: copy.eventDate, eventTime: copy.eventTime }]
    : [];
  const editorial: BlockConfig[] = [
    { id: `${id}-header`, type: 'header' }, text,
    { id: `${id}-divider`, type: 'divider' }, bullets, ...info, cta,
    { id: `${id}-footer`, type: 'footer', footerNote: copy.footerNote },
  ];
  const structured: BlockConfig[] = [
    { id: `${id}-header`, type: 'header' }, ...info, text, bullets,
    { id: `${id}-spacer`, type: 'spacer', height: 12 }, cta,
    { id: `${id}-footer`, type: 'footer', footerNote: copy.footerNote },
  ];
  return mode === 'editorial' ? editorial : structured;
}

function contentFor(id: TemplatePresetId, objective: TemplateType, mode: 'editorial' | 'structured'): EmailContent {
  const copy = COPY[objective];
  const dark = ['offer-focus', 'countdown', 'market-brief'].includes(id);
  return {
    subject: copy.headline, preheader: copy.body.slice(0, 110), presetId: id,
    label: copy.label, headline: copy.headline, body: copy.body,
    bulletsTitle: copy.bulletsTitle, bullets: copy.bullets,
    ctaText: copy.ctaText, ctaUrl: 'https://example.com', eventDate: copy.eventDate || '', eventTime: copy.eventTime || '',
    preCta: copy.preCta, footerNote: copy.footerNote, emailWidth: mode === 'editorial' ? 620 : 600,
    emailBgColor: dark ? '#0d1824' : mode === 'editorial' ? '#eee9df' : '#edf2f5',
    bodyBgColor: dark ? '#132333' : '#ffffff',
    typography: {
      headingFont: mode === 'editorial' ? 'Georgia' : 'Arial', bodyFont: mode === 'editorial' ? 'Verdana' : 'Arial',
      headingColor: dark ? '#f8f4ec' : '#10263a', bodyColor: dark ? '#d8e1e8' : '#425466',
      mutedColor: dark ? '#9fb0bd' : '#7a8792', linkColor: '#147ca8', ctaTextColor: '#ffffff',
    },
    blocks: blocksFor(id, objective, mode),
  };
}

export const TEMPLATE_PRESETS: TemplatePreset[] = PRESET_META.map(([id, objective, name, description, mode]) => ({
  id, objective, name, description, variant: mode === 'editorial' ? 'Editorial' : 'Estructurada',
  thumbnail: `/template-thumbnails/${id}.webp`, defaultContent: contentFor(id, objective, mode),
}));

export function presetsForObjective(objective: TemplateType): TemplatePreset[] {
  return TEMPLATE_PRESETS.filter(preset => preset.objective === objective);
}

export function getTemplatePreset(id: string | undefined): TemplatePreset | undefined {
  return TEMPLATE_PRESETS.find(preset => preset.id === id);
}

export function defaultPresetForObjective(objective: TemplateType): TemplatePreset {
  return presetsForObjective(objective)[0] || TEMPLATE_PRESETS[0];
}

export function applyPresetPreservingContent(preset: TemplatePreset, current: EmailContent): EmailContent {
  const next = structuredClone(preset.defaultContent);
  // D3: el contenido del usuario vive en content.blocks[] (fuente de verdad); se
  // extrae de ahí para preservarlo al cambiar de preset. Fallback a los campos
  // legacy solo por si llega un email viejo aún no migrado en memoria.
  const cur = current.blocks || [];
  const findBlock = <T extends CanvasBlockType>(type: T) => cur.find(block => block.type === type) as Extract<BlockConfig, { type: T }> | undefined;
  const textBlock = findBlock('text'); const bulletsBlock = findBlock('bullets');
  const ctaBlock = findBlock('cta'); const infoBlock = findBlock('infobox'); const footerBlock = findBlock('footer');
  const semantic = {
    label: textBlock?.label ?? current.label ?? '',
    headline: textBlock?.headline ?? current.headline ?? '',
    body: textBlock?.body ?? current.body ?? '',
    bulletsTitle: bulletsBlock?.bulletsTitle ?? current.bulletsTitle ?? '',
    bullets: bulletsBlock?.bullets ?? current.bullets ?? [],
    ctaText: ctaBlock?.ctaText ?? current.ctaText ?? '',
    ctaUrl: ctaBlock?.ctaUrl ?? current.ctaUrl ?? '',
    eventDate: infoBlock?.eventDate ?? current.eventDate ?? '',
    eventTime: infoBlock?.eventTime ?? current.eventTime ?? '',
    preCta: ctaBlock?.preCta ?? current.preCta ?? '',
    footerNote: footerBlock?.footerNote ?? current.footerNote ?? '',
  };
  const blocks = (next.blocks || []).map(block => {
    if (block.type === 'text') return { ...block, label: semantic.label || block.label, headline: semantic.headline || block.headline, body: semantic.body || block.body };
    if (block.type === 'bullets') return { ...block, bulletsTitle: semantic.bulletsTitle || block.bulletsTitle, bullets: semantic.bullets.some(Boolean) ? semantic.bullets : block.bullets };
    if (block.type === 'infobox') return { ...block, eventDate: semantic.eventDate || block.eventDate, eventTime: semantic.eventTime || block.eventTime };
    if (block.type === 'cta') return { ...block, ctaText: semantic.ctaText || block.ctaText, ctaUrl: semantic.ctaUrl || block.ctaUrl, preCta: semantic.preCta || block.preCta };
    if (block.type === 'footer') return { ...block, footerNote: semantic.footerNote || block.footerNote };
    return block;
  });
  // D3: no propagar los campos legacy de contenido; blocks[] es la fuente de verdad.
  const result: EmailContent = { ...next, subject: current.subject || next.subject, preheader: current.preheader || next.preheader, blocks };
  delete result.label; delete result.headline; delete result.body; delete result.bulletsTitle; delete result.bullets;
  delete result.ctaText; delete result.ctaUrl; delete result.eventDate; delete result.eventTime; delete result.preCta; delete result.footerNote;
  return result;
}
