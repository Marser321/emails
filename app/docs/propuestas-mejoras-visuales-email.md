# Propuestas de mejora visual del Email Builder (brief para GPT)

Documento de trabajo: cada propuesta trae qué hacer, en qué archivos, qué patrón existente copiar y qué restricciones respetar. Es la especificación para que GPT implemente cada mejora **sin romper la compatibilidad con clientes de correo**. Cada ítem de los Grupos A/B/C es un entregable independiente (un bloque o control por PR); ninguno depende del Grupo D.

---

## Cómo funciona el render HOY (contexto obligatorio)

- **Un solo pipeline de salida**: `renderEmail()` (`app/src/lib/templates.ts:645`) sanea marca y contenido, convierte contenido legacy a bloques con `legacyContentToBlocks()` (`app/src/lib/email-document.ts:4`) y **siempre** renderiza vía `renderCanvasEmail()` → `renderCanvasBlock()` (`app/src/lib/templates.ts:323`). Los layouts legacy `classic/minimal/hero/card` son **código muerto**: no tocar ese camino, todo va por `renderCanvasBlock`.
- **Modelo de bloques**: `content.blocks[]` (`BlockConfig[]`), 12 tipos en `CanvasBlockType` (`app/src/lib/types.ts:133`). El orden del array = orden de render. Cada bloque tiene `style?: BlockStyle` (color de fondo, paddings, y `text`/`label`/`heading` como `TextStyle`).
- **Los dos editores están desconectados**: la pestaña "Contenido" escribe campos legacy (`content.hero`, `content.gallery`, `content.quote`, `content.bullets`…); la pestaña "Canvas" escribe `content.blocks[]`. `legacyContentToBlocks` solo corre si `blocks` está vacío. Esta es la raíz del problema de "control total".

### Restricciones NO negociables (compatibilidad email)
1. **Solo tablas** (`role="presentation"`, `cellpadding/cellspacing/border=0`). Nunca flexbox/grid.
2. **Colores solo `#rrggbb`** de 6 dígitos: `sanitizeColor()` (`app/src/lib/email-safety.ts:32`) descarta rgb/hsl/nombres/gradientes. Los color pickers de la UI ya producen hex6.
3. **Fuentes solo las 5 de `EMAIL_SAFE_FONTS`** (Arial, Georgia, Tahoma, Trebuchet MS, Verdana).
4. **Outlook/MSO**: botones y elementos con radio necesitan fallback VML (ver `renderCTA`, `app/src/lib/templates.ts:296`). `border-left` NO es confiable → para barras de acento usar una **celda `<td width="4" bgcolor="…">`** como hace `renderQuote` (`app/src/lib/templates.ts:~275`).
5. **Todo texto de usuario pasa por `escapeHtml`**; los emojis Unicode pasan como texto plano (no requieren nada especial para renderizar).
6. **Peso <~102 KB** (Gmail recorta). El chequeo ya existe en `email-checks.ts`.

### Receta para agregar un bloque nuevo (aplica a A1–A4 y C1)
Cada bloque nuevo toca **5 lugares coordinados** (si se omite el saneador, el bloque se descarta o pasa sin escapar):
1. **`types.ts`**: agregar el string a `CanvasBlockType` (:133), crear `interface XxxBlockConfig extends BlockBase`, sumarlo a la unión `BlockConfig` (:237) y una entrada en `CANVAS_BLOCK_CATALOG` (:252) para que aparezca en la paleta.
2. **`templates.ts`**: nuevo `case 'xxx':` en el switch de `renderCanvasBlock` (:348, antes del `default` en :530). Ahí ya hay disponibles `accent`, `primary`, `padding`, `surface`, `textCss()`.
3. **`email-safety.ts`**: nuevo `case 'xxx':` en `sanitizeBlock` (:73). Colores con `sanitizeColor`, texto con `escapeHtml`, números con `clampOpt`.
4. **`CanvasEditor.tsx`**: formulario del bloque en `renderBlockEditor()` (:212) + icono en `BlockIcon.tsx`.
5. **`api-schemas.ts`**: schema zod del bloque si aplica (validación de guardado en historial).

---

## GRUPO A — Barras/bandas de color, badges y callouts (bloques nuevos)

### A1. Bloque "Banda de color" (`band`)
Banda full-width de color sólido o gradiente, con texto opcional centrado (ej. "🎁 ENVÍO GRATIS HOY", "⏳ ÚLTIMAS HORAS"). El elemento estrella para "barras de colores".
- **Campos**: `bgColor?` (hex6), `useGradient?` (bool → usa `gradientStart/End`), `text?`, `textColor?` (hex6, default `#ffffff`), `height?` (clamp 4–80 si no hay texto), `emoji?`.
- **Render**: patrón de la GRADIENT BAR del header (`templates.ts:359-362`): `<td>` con `background-color` + `background-image:linear-gradient(90deg,...)`. Con texto: `<td align="center" bgcolor style="padding:12px 24px;">` + `<p>` con emoji + texto.
- **Saneado**: `bgColor`/`textColor` con `sanitizeColor`, `text`/`emoji` con `escapeHtml`, `height` con `clampOpt(…,4,80)`.

### A2. Separador decorativo configurable (extender `divider`)
Hoy `DividerBlockConfig` no tiene campos y el separador es una línea fija `1px solid #e5eaf0` (`templates.ts:486`).
- **Campos nuevos**: `color?` (hex6), `thickness?` (clamp 1–8), `lineStyle?` (`'solid'|'dashed'|'dotted'`), `ornament?` (emoji centrado sobre la línea, ej. ✦ ● ✂).
- **Render**: `border-top:${thickness}px ${lineStyle} ${color}`. Para ornamento centrado: tabla de 3 celdas (línea / emoji / línea). Nota: `dashed/dotted` degrada a `solid` en Outlook — aceptable.
- **Saneado**: color con `sanitizeColor`, `thickness` con `clampOpt`, `lineStyle` validado contra la lista, `ornament` con `escapeHtml`.

### A3. Bloque "Badge / Etiqueta" (`badge`)
Pill de color centrada, corta (ej. "OFERTA", "NUEVO", "🔥 HOT"). Detalle visual para jerarquizar.
- **Campos**: `text`, `emoji?`, `bgColor?` (hex6), `textColor?` (hex6), `align?` (`left|center|right`).
- **Render**: tabla centrada, `<td bgcolor style="padding:6px 16px;border-radius:100px;">` + texto uppercase con `letter-spacing`. Outlook ignora el radio → cae a rectángulo (aceptable) o VML pill opcional.
- **Saneado**: colores con `sanitizeColor`, `text`/`emoji` con `escapeHtml`, `align` validado.

### A4. Bloque "Callout / Resaltado" (`callout`)
Caja de resaltado de propósito general (generaliza el `infobox`, que hoy es solo fecha/hora). Para tips, avisos, garantías.
- **Campos**: `emoji?`, `title?`, `body?`, `bgColor?` (hex6, default = `lightenColor(accent,85)`), `accentColor?` (hex6, barra lateral).
- **Render**: reutilizar el patrón de `renderQuote` (barra de acento vertical con celda `<td width="4" bgcolor>`) + fondo claro tipo `infobox` (`templates.ts:436`). Emoji grande a la izquierda opcional.
- **Saneado**: colores con `sanitizeColor`, textos con `escapeHtml`/`escapeTextWithBreaks`.

---

## GRUPO B — Emojis e iconos

### B1. Selector de emojis en campos de texto (UI, sin tocar el motor)
Los emojis ya renderizan como texto Unicode; solo falta insertarlos fácil.
- **Qué**: botón 😀 junto a los campos de texto (o dentro del dropdown de acciones IA `renderInlineAiActions()`, `page.tsx:958`) que abre un panel de emojis curados por categoría e inserta en la posición del cursor del input/textarea enfocado.
- **Dónde**: nuevo componente `EmojiPicker.tsx` + integración en la pestaña Contenido y en los editores de bloque de `CanvasEditor.tsx`. Sin dependencias externas pesadas: una lista curada de ~80 emojis relevantes (marketing/crédito/urgencia) alcanza. Solo UI, no toca templates ni saneadores.

### B2. Bullets con icono/emoji personalizable (extender `bullets`)
Hoy los bullets usan un marcador fijo `&#8226;` en color accent (`templates.ts:424`).
- **Campos nuevos en `BulletsBlockConfig`**: `marker?` (emoji o carácter; default `•`), `perBulletMarker?` (opcional: array paralelo para un emoji distinto por bullet, ej. ✅ ✅ ✅).
- **Render**: reemplazar `&#8226;` por `marker` escapado (o el emoji por índice si `perBulletMarker`).
- **Saneado**: `marker`/`perBulletMarker` con `escapeHtml` en el `case 'bullets'` de `sanitizeBlock` (`email-safety.ts:96`).

---

## GRUPO C — Estilo del botón CTA

### C1. Controles visuales del CTA (extender `cta` + `renderCTA`)
Hoy el CTA hereda el color de acento y tiene radio/padding fijos (`templates.ts:296`, case `cta` :467).
- **Campos nuevos en `CtaBlockConfig`**: `ctaBgColor?` (hex6), `ctaTextColor?` (hex6), `ctaRadius?` (clamp 0–28), `ctaFullWidth?` (bool), `ctaSize?` (`'sm'|'md'|'lg'` → mapea padding/fontSize).
- **Render**: extender la firma de `renderCTA` para aceptar estos overrides. **Clave Outlook**: el radio vive en dos lados — el `arcsize` del `<v:roundrect>` (VML) y el `border-radius` del `<a>`. Ambos deben derivar de `ctaRadius`. Para `fullWidth`, ajustar `width` del `v:roundrect` y `display:block` del `<a>`.
- **Saneado**: colores con `sanitizeColor`, `ctaRadius` con `clampOpt`, `ctaSize` validado, en el `case 'cta'` de `sanitizeBlock` (`email-safety.ts:102`).
- **UI**: agregar estos controles al editor del bloque CTA en `CanvasEditor.tsx` (:379) — pickers de color + slider de radio + toggle full-width + selector de tamaño.

---

## GRUPO D — Control total: unificar los dos editores (refactor grande)

**Problema**: "Contenido" edita campos legacy; "Canvas" edita `blocks[]`; `legacyContentToBlocks` solo corre si `blocks` está vacío. Editar en una pestaña después de usar la otra da resultados ambiguos o se pisa. Para "control total": **una sola fuente de verdad, `content.blocks[]`**.

Refactor de riesgo (afecta historial y borradores guardados) → **3 fases entregables por separado**:

- **Fase D1 — Fuente única de verdad**: al cargar/crear cualquier email, poblar siempre `content.blocks[]` (vía `legacyContentToBlocks` si viene vacío). Los borradores/historial viejos se migran al abrirse (base: `normalizeEmailDocument`, `email-document.ts:101`). Verificar que guardar no pierda bloques. **Riesgo bajo-medio.**
- **Fase D2 — Pestaña "Contenido" opera sobre bloques**: reescribir los campos de la pestaña Contenido para que lean/escriban el bloque correspondiente dentro de `blocks[]` (buscar por `type`/`id`) en vez de los campos legacy. El usuario sigue viendo un formulario simple, pero editando el modelo real. Incluye **reordenar bloques desde Contenido** (hoy solo en Canvas). **Riesgo medio-alto** — el grueso del trabajo.
- **Fase D3 — Deprecar campos legacy**: dejar los campos legacy como solo-lectura para compatibilidad hacia atrás y quitar la ruta de escritura duplicada. Limpiar `documentToContent`/`legacyContentToBlocks` según lo que quede en uso.

**Ganancias incluidas en D2**: exponer en la UI campos que ya existen en el modelo pero no tienen control hoy — **`subject` y `preheader`** (`types.ts:273`, sin inputs) y el **CTA secundario** (`secondaryCtaText/Url`, hoy solo en Canvas). Y llevar el editor de estilo por bloque (`renderStyleEditor`, `CanvasEditor.tsx:421`) a la experiencia unificada.

---

## Orden sugerido de ejecución con GPT

1. **B1 (emoji picker)** y **A1 (banda de color)** — mayor impacto visual inmediato, bajo riesgo.
2. **A2 (divisor decorativo)**, **A3 (badge)**, **A4 (callout)** — mismo patrón de bloque, en serie.
3. **B2 (bullets con emoji)** y **C1 (estilo CTA)** — extienden bloques existentes.
4. **D1 → D2 → D3** — unificación, cada fase con verificación antes de la siguiente.

> Recomendación: hacer A/B/C primero (bajo riesgo, valor visual inmediato para los mails de AMO) y encarar D como proyecto aparte, empezando por D1.

---

## Verificación (para cada mejora, antes de darla por cerrada)

1. **Dev server** en :3000 (cambios por HMR). Abrir `/editor`.
2. **Render sano**: agregar el bloque/control nuevo y verificar el HTML generado por `renderEmail`. (En la máquina de Mario los screenshots del Browser pane fallan → verificar con `javascript_tool`/`read_page` y leyendo el HTML.)
3. **Saneado**: confirmar que el campo nuevo sobrevive a `sanitizeContentForEmail`/`sanitizeBlock` (color inválido → cae al default; `<script>` en texto → se escapa).
4. **Salud & Métricas**: la sección 🩺 del editor no debe reportar nuevos problemas (peso, alt, links).
5. **Outlook/MSO**: barras, badges y CTA deben tener su fallback (celda `bgcolor` / VML) y no depender de `border-radius`/`border-left`.
6. **Compat. hacia atrás (solo D)**: abrir un email viejo del historial de AMO y confirmar que se ve igual tras la migración a `blocks[]`.
7. `npx tsc --noEmit` y `npm run lint` (quedan avisos preexistentes de `react-hooks/set-state-in-effect`, no bloquean).

## Archivos clave
- Motor de render: `app/src/lib/templates.ts` (`renderCanvasBlock` :323, helpers :129–315)
- Modelo de bloques: `app/src/lib/types.ts` (:133–265)
- Saneado (obligatorio): `app/src/lib/email-safety.ts` (`sanitizeBlock` :73)
- Conversión legacy↔bloques: `app/src/lib/email-document.ts`
- UI editor: `app/src/app/editor/page.tsx`, `app/src/components/CanvasEditor.tsx`, `app/src/components/VisualDesignHub.tsx`
- Schema de guardado: `app/src/lib/server/api-schemas.ts`
