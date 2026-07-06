// Prompts compartidos entre motores (Gemini y Claude) con inyección de memoria de marca
import { Brand, EmailHistoryEntry, TemplateType } from '@/lib/types';

function truncate(text: string, max: number): string {
  if (!text || text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

// Bloque "Perfil de voz" — se inyecta cuando la marca tiene voice configurado
export function buildVoiceBlock(brand: Brand): string {
  const v = brand.voice;
  if (!v || (!v.toneOfVoice && !v.audience && !v.styleNotes && !(v.samplePhrases?.length))) {
    return '';
  }
  const lines: string[] = [`\n## Perfil de voz de la marca "${brand.name}"`];
  if (v.toneOfVoice) lines.push(`- Tono de voz: ${v.toneOfVoice}`);
  if (v.audience) lines.push(`- Audiencia: ${v.audience}`);
  if (v.styleNotes) lines.push(`- Notas de estilo: ${v.styleNotes}`);
  if (v.samplePhrases?.length) {
    lines.push(`- Frases típicas de la marca: "${v.samplePhrases.filter(Boolean).join('", "')}"`);
  }
  lines.push('Respeta este perfil de voz en todo el texto que generes.');
  return lines.join('\n');
}

// Bloque few-shot — emails con rating 👍 de esta marca (aprendizaje del estilo real usado)
export function buildExamplesBlock(examples: EmailHistoryEntry[]): string {
  if (!examples.length) return '';
  const parts: string[] = [
    '\n## Ejemplos de emails aprobados por el usuario para esta marca',
    'Imita su ESTILO y tono, NO su contenido:',
  ];
  examples.slice(0, 3).forEach((e, i) => {
    const c = e.content;
    const sample = {
      label: c.label,
      headline: c.headline,
      body: truncate(c.body, 600),
      bullets: c.bullets?.filter(Boolean),
      ctaText: c.ctaText,
      preCta: c.preCta,
    };
    parts.push(`### Ejemplo ${i + 1} — instrucción original: "${truncate(e.prompt, 200)}"`);
    parts.push(JSON.stringify(sample, null, 2));
  });
  return parts.join('\n');
}

export function buildGenerateSystemPrompt(brand: Brand, examples: EmailHistoryEntry[]): string {
  return `
Eres un copywriter experto en email marketing directo y conversión para la agencia AD Media Solution.
Tu tarea es escribir el contenido de un email altamente persuasivo basado en un tipo de template,
información de la marca, y una breve instrucción del usuario.

Debes retornar ÚNICAMENTE un objeto JSON válido que cumpla con la siguiente estructura, sin markdown adicional, sin envolverlo en bloques de código de tipo json. Solo la cadena JSON limpia:

{
  "label": "Etiqueta superior corta en mayúsculas (ej: REGISTRO CONFIRMADO, MASTERCLASS GRATUITA, OFERTA LIMITADA)",
  "headline": "Título principal llamativo e impactante",
  "body": "Texto principal del cuerpo del email (1 o 2 párrafos persuasivos que conecten con el lector). Usa {{contact.first_name}} de vez en cuando de forma natural para referirte al destinatario.",
  "bulletsTitle": "Título corto y fuerte para la lista de puntos clave (ej: En esta clase vas a descubrir:)",
  "bullets": ["Punto clave 1 centrado en beneficio", "Punto clave 2 centrado en beneficio", "Punto clave 3 centrado en beneficio"],
  "ctaText": "Texto del botón de acción principal (corto, de alta conversión)",
  "ctaUrl": "URL para el botón",
  "eventDate": "Fecha corta del evento (si aplica, ej: 18 de julio)",
  "eventTime": "Hora del evento (si aplica, ej: 11:00 AM EST)",
  "preCta": "Llamado a la acción rápido en texto justo antes del botón (ej: Haz clic abajo para reservar tu cupo)",
  "footerNote": "Nota al pie sutil (ej: Cupos limitados · Reserva tu lugar ahora)",
  "emailBgColor": "Código de color hexadecimal para el fondo exterior (ej: #f3f4f6 o un color desaturado claro/oscuro acorde al tema)",
  "bodyBgColor": "Código de color hexadecimal para el contenedor interno (ej: #ffffff para luz, o tono oscuro coordinado si es oscuro)"
}

Reglas de redacción:
1. Tono persuasivo, profesional pero cercano.
2. No uses hashtags ni emojis excesivos (máximo 1 o 2 emojis relevantes en el cuerpo).
3. Escribe 100% en español neutral.
4. Asegúrate de adaptar la redacción a la categoría de la marca: ${brand.category}.
5. La marca se llama "${brand.name}". Su tagline es "${brand.footer?.tagline || ''}".
6. Elige emailBgColor y bodyBgColor para reflejar el tono del mensaje (ej: tonos claros y limpios para newsletters, u oscuros elegantes para ofertas premium nocturnas).
${buildVoiceBlock(brand)}${buildExamplesBlock(examples)}
`;
}

export function buildGenerateUserPrompt(prompt: string, templateType: TemplateType, brand: Brand): string {
  return `
Escribe un email para el template de tipo: "${templateType}".
Instrucción del usuario: "${prompt}"
Color de acento de la marca (por si debes sugerir colores coordinados): "${brand.colors?.accent || ''}"
`;
}

export function refineCommandPrompt(command: string): string {
  switch (command) {
    case 'optimize':
      return 'Mejora la persuasión, el enganche y la fluidez del texto para marketing directo de conversión. Mantén el significado pero hazlo sonar extremadamente profesional e irresistible en español.';
    case 'shorten':
      return 'Haz el texto más corto, directo e impactante. Elimina palabras innecesarias sin perder el núcleo del mensaje. Mantén el idioma español.';
    case 'casual':
      return 'Cambia el tono a un estilo informal, cercano, empático y de tú a tú en español neutral. Como si le hablaras a un amigo pero manteniendo el propósito de marketing.';
    case 'formal':
      return 'Cambia el tono a un estilo formal, corporativo y profesional en español neutral.';
    default:
      return 'Optimiza este texto para email marketing en español.';
  }
}

export function buildRefineSystemPrompt(field: string, brand?: Brand): string {
  const voiceBlock = brand ? buildVoiceBlock(brand) : '';
  return `
Eres un copywriter experto en email marketing directo y conversión para la agencia AD Media Solution.
Tu tarea es refinar o reescribir un fragmento de texto de un correo electrónico (por ejemplo: el título, cuerpo, viñetas, o texto de llamada a la acción) según la instrucción que te dé el usuario.

Debes retornar ÚNICAMENTE el texto resultante en el formato final, sin formateo markdown adicional, sin comillas externas de bloque de código, sin envolverlo en bloques JSON ni agregar "Aquí tienes el texto:". Devuelve la respuesta directamente en texto plano.

Reglas importantes:
1. Mantén la personalización como {{contact.first_name}} si ya existe en el texto, o consérvala si es natural.
2. No uses hashtags ni emojis excesivos.
3. Escribe en español neutral.
4. El fragmento pertenece al campo: "${field}".
${voiceBlock}
`;
}

export function buildRefineUserPrompt(text: string, command: string): string {
  return `
Texto original: "${text}"
Instrucción de refinamiento: "${refineCommandPrompt(command)}"
`;
}

export function buildAbSystemPrompt(): string {
  return `
Eres un copywriter experto en email marketing directo y conversión para la agencia AD Media Solution.
Tu tarea es escribir 3 variantes de líneas de asunto (Subject Lines) de alta conversión y 3 preheaders (texto de vista previa) complementarios basados en el contenido de un email (título y cuerpo).

Debes retornar ÚNICAMENTE un objeto JSON válido que cumpla con la siguiente estructura, sin markdown adicional, sin envolverlo en bloques de código de tipo json. Solo la cadena JSON limpia:

{
  "subjects": [
    { "type": "Beneficio Directo", "text": "Línea de asunto clara enfocada en el beneficio principal" },
    { "type": "Curiosidad / Intriga", "text": "Línea de asunto misteriosa que obligue a abrir" },
    { "type": "Urgencia / Escasez", "text": "Línea de asunto que induzca prisa o exclusividad" }
  ],
  "preheaders": [
    "Preheader complementario corto para el asunto 1",
    "Preheader complementario corto para el asunto 2",
    "Preheader complementario corto para el asunto 3"
  ]
}

Reglas de redacción:
1. Mantén los asuntos menores a 60 caracteres si es posible.
2. El preheader debe continuar o complementar el asunto de forma atractiva.
3. No uses más de 1 emoji relevante por asunto.
4. Todo en español neutral e irresistible.
`;
}

export function buildAbUserPrompt(headline: string, body: string): string {
  return `
Título del Email: "${headline || ''}"
Cuerpo del Email: "${body || ''}"
`;
}

// JSON Schemas — usados por Claude (output_config.format garantiza JSON válido)
export const GENERATE_JSON_SCHEMA = {
  type: 'object',
  properties: {
    label: { type: 'string' },
    headline: { type: 'string' },
    body: { type: 'string' },
    bulletsTitle: { type: 'string' },
    bullets: { type: 'array', items: { type: 'string' } },
    ctaText: { type: 'string' },
    ctaUrl: { type: 'string' },
    eventDate: { type: 'string' },
    eventTime: { type: 'string' },
    preCta: { type: 'string' },
    footerNote: { type: 'string' },
    emailBgColor: { type: 'string' },
    bodyBgColor: { type: 'string' },
  },
  required: [
    'label', 'headline', 'body', 'bulletsTitle', 'bullets', 'ctaText', 'ctaUrl',
    'eventDate', 'eventTime', 'preCta', 'footerNote', 'emailBgColor', 'bodyBgColor',
  ],
  additionalProperties: false,
};

export const ABTEST_JSON_SCHEMA = {
  type: 'object',
  properties: {
    subjects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string' },
          text: { type: 'string' },
        },
        required: ['type', 'text'],
        additionalProperties: false,
      },
    },
    preheaders: { type: 'array', items: { type: 'string' } },
  },
  required: ['subjects', 'preheaders'],
  additionalProperties: false,
};

// Limpieza de respuestas de texto plano (portada de la lógica original de refine)
export function cleanPlainText(text: string): string {
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/i, '').replace(/\n?```$/, '');
  }
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }
  return cleaned.trim();
}
