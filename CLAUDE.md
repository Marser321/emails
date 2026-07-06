# Email Builder — AD Media Solution

Workspace local de Mario para generar los emails HTML del día a día de la agencia.
**La carpeta es la base de datos**: todo lo que la app guarda vive en `data/` como JSON
editable — por Claude Code, a mano, o desde la UI.

## Estructura

```
app/                      # Next.js 16 (App Router). Correr con: cd app && npm run dev (puerto 3000)
data/                     # ← LA BASE DE DATOS (respaldable, editable, versionable)
├── brands.json           # Marcas: colores, fuentes, logo, footer y "voice" (tono, audiencia, frases)
├── drafts.json           # Borradores guardados desde la Biblioteca del editor
├── settings.json         # API keys (Gemini/Anthropic) y motor por defecto — NO versionar ni compartir
├── history/<brandId>.json# Historial de emails generados: prompt, contenido, HTML, rating 👍/👎
└── assets/<brandId|_shared>/  # Imágenes: logos, heros, adsets. Soltar archivos acá desde Finder funciona.
```

## Ciclo de aprendizaje diario

1. Generar email con IA en `/editor` (motor Gemini o Claude, seleccionable).
2. Editar a gusto → **Copiar HTML** (el snapshot final se guarda en el historial).
3. Calificar con 👍/👎 en la toolbar del preview (o en el dashboard).
4. Los emails con 👍 se inyectan como ejemplos few-shot en las próximas generaciones
   de esa marca, junto con el perfil de voz (`brand.voice`, editable en el modal de marca).

Cuanto más se usa y califica, mejor escribe la IA para cada marca.

## Cómo enriquecer marcas desde Claude Code

- Editar `data/brands.json` directamente (la UI refleja los cambios al recargar).
- El campo `voice` de cada marca alimenta los prompts: `toneOfVoice`, `audience`,
  `styleNotes`, `samplePhrases[]`.
- Historial por marca en `data/history/<brandId>.json` — cambiar `rating` a `"up"`
  promueve ese email como ejemplo de estilo.

## Imágenes en los emails

Las imágenes locales se sirven en `/api/assets/<brandId>/<archivo>` (solo funcionan
en esta máquina). Al copiar/descargar un HTML que las usa, la app ofrece:
reescribir a una URL pública (recomendado — subir `data/assets/` al hosting/CDN),
descargar ZIP (html + imágenes), o embeber base64 (solo archivo; Gmail/Outlook lo bloquean).

## Notas técnicas

- `app/AGENTS.md`: este Next.js 16 tiene breaking changes — leer
  `app/node_modules/next/dist/docs/` antes de tocar rutas/APIs. En rutas dinámicas
  `params` es una Promise (`const { id } = await params`).
- Capa server en `app/src/lib/server/`: stores de datos (`brandStore`, `historyStore`,
  `settingsStore`), abstracción IA (`ai.ts`, `prompts.ts`, `providers/{gemini,claude}.ts`).
- Motores IA: Gemini `gemini-2.5-flash` y Claude `claude-sonnet-5`. Claude: sin
  `temperature` (rechaza no-default), JSON vía `output_config.format`, sin prefill.
- Prioridad de API keys: variables de entorno (`GEMINI_API_KEY`/`ANTHROPIC_API_KEY`)
  > `data/settings.json`.
- Los emails se renderizan en `app/src/lib/templates.ts`: tablas + MSO/VML, nunca
  flexbox/grid. 4 layouts (classic/minimal/hero/card) + bloques opcionales
  (hero, imagen+texto, galería/adset, testimonio) en `EmailContent`.
- Lint: quedan avisos preexistentes de `react-hooks/set-state-in-effect` (patrón
  `setMounted` original); no bloquean nada.
