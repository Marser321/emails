import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { requireUser } from '@/lib/server/auth';
import { resolveApiKey } from '@/lib/server/settingsStore';

export async function POST(req: Request) {
  try {
    // 1. Validar autenticación
    await requireUser();

    // 2. Obtener clave de Gemini
    const apiKey = await resolveApiKey('gemini');
    if (!apiKey) {
      return NextResponse.json({ error: 'La API key de Gemini no está configurada.' }, { status: 400 });
    }

    // 3. Validar entrada
    const { url } = await req.json();
    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return NextResponse.json({ error: 'URL inválida o ausente. Debe comenzar con http:// o https://' }, { status: 400 });
    }

    // 4. Descargar HTML con timeout y User Agent
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

    let html = '';
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`Código de estado HTTP: ${response.status}`);
      }
      html = await response.text();
    } catch (fetchErr) {
      clearTimeout(timeoutId);
      return NextResponse.json({ 
        error: `No se pudo acceder al sitio web: ${fetchErr instanceof Error ? fetchErr.message : 'Error de red o timeout'}` 
      }, { status: 422 });
    }

    if (!html || html.length < 100) {
      return NextResponse.json({ error: 'El sitio web no devolvió suficiente contenido HTML para analizar.' }, { status: 422 });
    }

    // 5. Preprocesamiento básico de HTML (Sin librerías externas)
    // Helper para resolver URLs relativas
    const resolveUrl = (relativeUrl: string): string => {
      if (!relativeUrl) return '';
      try {
        return new URL(relativeUrl, url).toString();
      } catch {
        return relativeUrl;
      }
    };

    // Extraer título
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1].trim() : '';

    // Extraer meta description
    const descMatch = 
      html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([\s\S]*?)["']/i) || 
      html.match(/<meta[^>]+content=["']([\s\S]*?)["'][^>]+name=["']description["']/i) ||
      html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([\s\S]*?)["']/i);
    const metaDescription = descMatch ? descMatch[1].trim() : '';

    // Extraer favicon y logos candidatos
    const candidateLogos: string[] = [];

    // Buscar favicons en link tags
    const iconRegex = /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/gi;
    let iconMatch;
    while ((iconMatch = iconRegex.exec(html)) !== null) {
      candidateLogos.push(resolveUrl(iconMatch[1]));
    }

    // Apple Touch Icon
    const appleIconRegex = /<link[^>]+rel=["']apple-touch-icon["'][^>]+href=["']([^"']+)["']/gi;
    let appleMatch;
    while ((appleMatch = appleIconRegex.exec(html)) !== null) {
      candidateLogos.push(resolveUrl(appleMatch[1]));
    }

    // Buscar imágenes con "logo" en el nombre o alt
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    let imgCount = 0;
    while ((imgMatch = imgRegex.exec(html)) !== null && imgCount < 15) {
      const src = imgMatch[1];
      const imgTag = imgMatch[0];
      if (
        src.toLowerCase().includes('logo') || 
        src.toLowerCase().includes('brand') || 
        src.toLowerCase().includes('lockup') ||
        imgTag.toLowerCase().includes('logo')
      ) {
        candidateLogos.push(resolveUrl(src));
      }
      imgCount++;
    }

    // Limpiar duplicados de logos
    const uniqueLogos = Array.from(new Set(candidateLogos)).slice(0, 5);

    // Extraer muestras de texto (encabezados y primeros párrafos)
    const textElements: string[] = [];
    const textRegex = /<(h1|h2|h3|p)[^>]*>([\s\S]*?)<\/\1>/gi;
    let textMatch;
    let textCount = 0;
    while ((textMatch = textRegex.exec(html)) !== null && textCount < 25) {
      const cleanText = textMatch[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (cleanText.length > 15) {
        textElements.push(`${textMatch[1].toUpperCase()}: ${cleanText}`);
        textCount++;
      }
    }
    const sampleText = textElements.join('\n');

    // 6. Configurar llamada al LLM (Gemini)
    const ai = new GoogleGenAI({ apiKey });
    const model = 'gemini-2.5-flash';

    const systemPrompt = `Actúas como un Director de Arte y Especialista en Branding de primer nivel para AD Media Solution.
Tu tarea es analizar los metadatos y el contenido de un sitio web para deducir y diseñar la identidad visual y comunicativa de la marca.
Debes devolver estrictamente un objeto JSON que siga el siguiente esquema, sin textos explicativos ni formato fuera del JSON:

{
  "name": "Nombre comercial simplificado de la marca",
  "category": "Elegir la categoría más adecuada entre: Marketing, Finanzas, Real Estate, Fitness, Tecnología, Salud, Educación, E-commerce, Legal, Automotriz o General",
  "colors": {
    "primary": "Color corporativo principal oscuro o dominante (HEX #, ej: #0B2A4A). Asegura legibilidad sobre fondo blanco",
    "accent": "Color de acento o llamado a la acción contrastante (HEX #, ej: #29ABE2)",
    "gradientStart": "Color de inicio para gradientes, combinable con accent o primary (HEX #)",
    "gradientEnd": "Color de fin para gradientes, combinable con gradientStart (HEX #)"
  },
  "fonts": {
    "heading": "Una fuente elegante de Google Fonts para títulos (ej: Montserrat, Poppins, Inter, Oswald, Playfair Display, Raleway, Open Sans, Roboto)",
    "body": "Una fuente legible para correos (ej: Verdana, Arial, Georgia, Tahoma, Helvetica)"
  },
  "logo": {
    "type": "image" o "text" (usa "image" si se detecta un logo en imagen válido, de lo contrario "text"),
    "value": "La URL del logo en imagen más probable de la lista provista. Si no hay imágenes válidas, propone un logo en texto formateado como 'TEXTO1|TEXTO2' donde TEXTO1 se mostrará blanco y TEXTO2 en acento (ej: 'AD|MEDIA').",
    "imageWidth": 180,
    "showName": false
  },
  "footer": {
    "tagline": "Una frase corta que defina el eslogan o propósito de la marca",
    "subtitle": "La categoría o descripción resumida del negocio",
    "disclaimer": "Declaración legal o aclaración de cumplimiento adecuada según la industria (en español)"
  },
  "voice": {
    "toneOfVoice": "Descripción del tono de voz para la redacción de correos (ej: Profesional, cercano, empático y directo)",
    "audience": "La audiencia o público objetivo principal del negocio",
    "styleNotes": "Indicaciones clave de estilo de redacción (ej: Evitar tecnicismos complejos, usar preguntas retóricas, enfocarse en beneficios inmediatos)",
    "samplePhrases": [
      "Frase de ejemplo que defina el tono de voz de la marca 1",
      "Frase de ejemplo que defina el tono de voz de la marca 2"
    ]
  }
}

Consideraciones importantes:
1. Si detectas códigos de color en el HTML provisto, utilízalos. Si no, deduce colores estéticos basados en la industria.
2. Si el logo seleccionado en uniqueLogos es un favicon (ej: con extensión .ico o tamaño pequeño), prefiere configurar el logo como type: "text" con una buena estructura de texto de marca (ej: "BRAND|NAME") para mejor legibilidad.
3. Asegura que los colores elegidos sean complementarios, modernos y que pasen los principios básicos de legibilidad de texto en correos electrónicos.`;

    const userPrompt = `Analiza el sitio web con la siguiente información:
URL: ${url}
Título de Página: ${pageTitle}
Meta Descripción: ${metaDescription}
Logos Candidatos Detectados: ${JSON.stringify(uniqueLogos)}
Contenido de Texto del Sitio Web:
"""
${sampleText}
"""`;

    const response = await ai.models.generateContent({
      model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    });

    const resultText = response.text;
    if (!resultText) {
      return NextResponse.json({ error: 'La IA no devolvió ningún análisis.' }, { status: 500 });
    }

    const brandProfile = JSON.parse(resultText);
    return NextResponse.json({ brand: brandProfile });

  } catch (error) {
    console.error('Error en brand-scraper:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Error interno al analizar la marca' 
    }, { status: 500 });
  }
}
