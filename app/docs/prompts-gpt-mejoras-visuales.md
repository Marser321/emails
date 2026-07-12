# Prompts individuales para GPT — mejoras visuales del Email Builder

Cada bloque `### PROMPT` es autónomo: copialo y pegalo tal cual en GPT. Trabajan sobre el repo `Emails/app` (Next.js 16). Recomendado pegar **primero** el "CONTEXTO COMÚN" una vez si tu sesión de GPT lo conserva; si no, cada prompt ya repite las reglas mínimas.

---

## CONTEXTO COMÚN (pegar una vez al inicio de la sesión de GPT)

```
Trabajás en un email builder Next.js 16 en la carpeta `app/`. Los emails se generan como HTML compatible con clientes de correo.

Pipeline de render (NO cambiar la arquitectura):
- `renderEmail()` en app/src/lib/templates.ts (~línea 645) sanea y SIEMPRE renderiza vía `renderCanvasEmail()` → `renderCanvasBlock()` (~línea 323).
- El contenido es un array `content.blocks[]` de tipo `BlockConfig[]`. Los tipos están en app/src/lib/types.ts (`CanvasBlockType` ~línea 133).
- Los layouts legacy classic/minimal/hero/card son código muerto: NO los toques.

REGLAS OBLIGATORIAS de compatibilidad email:
1. Solo tablas HTML (role="presentation", cellpadding/cellspacing/border=0). Nunca flexbox/grid.
2. Colores solo formato #rrggbb (6 dígitos). La función `sanitizeColor()` en app/src/lib/email-safety.ts descarta cualquier otro formato.
3. Fuentes solo las de `EMAIL_SAFE_FONTS` (Arial, Georgia, Tahoma, Trebuchet MS, Verdana).
4. Outlook: elementos con radio o botones necesitan fallback VML (ver `renderCTA` en templates.ts ~línea 296). `border-left` NO es confiable → para barras laterales usar una celda `<td width="4" bgcolor="...">` como en `renderQuote` (~línea 275).
5. Todo texto de usuario debe pasar por `escapeHtml`. Los emojis Unicode pasan como texto plano.
6. El HTML total debe pesar <~102 KB.

Al agregar un bloque nuevo, tocás SIEMPRE estos 5 lugares y en este orden:
1. app/src/lib/types.ts — string en `CanvasBlockType`, `interface XxxBlockConfig extends BlockBase`, sumarlo a la unión `BlockConfig`, y entrada en `CANVAS_BLOCK_CATALOG`.
2. app/src/lib/templates.ts — `case 'xxx':` en el switch de `renderCanvasBlock` (antes del `default`). Tenés disponibles: accent, primary, padding, surface, textCss().
3. app/src/lib/email-safety.ts — `case 'xxx':` en `sanitizeBlock` (~línea 73). Colores con `sanitizeColor`, texto con `escapeHtml`, números con `clampOpt`.
4. app/src/components/CanvasEditor.tsx — formulario del bloque en `renderBlockEditor()` (~línea 212) + icono en app/src/components/BlockIcon.tsx.
5. app/src/lib/server/api-schemas.ts — schema zod del bloque (validación al guardar en historial).

Verificación al terminar: `npx tsc --noEmit` y `npm run lint` sin errores nuevos (hay warnings preexistentes de react-hooks/set-state-in-effect, ignorables). Probar en /editor que el bloque se agrega, renderiza y sobrevive al saneado (un color inválido debe caer al default; un `<script>` en texto debe escaparse).
```

---

## GRUPO A — Bloques visuales nuevos

### PROMPT A1 — Bloque "Banda de color" (`band`)

```
Agregá un bloque nuevo `band` al email builder (app/): una banda full-width de color, sólida o con gradiente horizontal, con texto opcional centrado (ej. "🎁 ENVÍO GRATIS HOY", "⏳ ÚLTIMAS HORAS"). Sirve como barra de color destacada entre secciones.

Campos del bloque (interface `BandBlockConfig extends BlockBase`, type 'band'):
- bgColor?: string (#rrggbb)
- useGradient?: boolean  // si true, usa gradiente entre gradientStart y gradientEnd
- gradientStart?: string, gradientEnd?: string (#rrggbb)
- text?: string
- textColor?: string (#rrggbb, default '#ffffff')
- emoji?: string
- height?: number  // altura en px cuando NO hay texto; clamp 4–80

Render (case 'band' en renderCanvasBlock de app/src/lib/templates.ts):
- Copiá el patrón de la "GRADIENT BAR" del header (templates.ts ~línea 359-362): un `<td>` con `background-color:${bgColor}` y, si useGradient, además `background-image:linear-gradient(90deg,${gradientStart},${gradientEnd})`.
- Sin texto: celda de altura `height`, `line-height` igual, `font-size:0`.
- Con texto: `<td align="center" bgcolor="${bgColor}" style="padding:12px 24px;">` + `<p style="margin:0;color:${textColor};font-weight:800;font-family:...;">${emoji} ${text}</p>`. Poné `bgcolor` en el `<td>` para Outlook.

Saneado (case 'band' en sanitizeBlock de app/src/lib/email-safety.ts):
- bgColor/textColor/gradientStart/gradientEnd con `sanitizeColor(valor, default)`.
- text/emoji con `escapeHtml`.
- height con `clampOpt(block.height, 4, 80)`.

Seguí las REGLAS OBLIGATORIAS de compatibilidad email (solo tablas, colores #rrggbb, escapeHtml). Tocá los 5 lugares (types.ts, templates.ts, email-safety.ts, CanvasEditor.tsx + BlockIcon.tsx, api-schemas.ts). En CanvasEditor.tsx agregá el formulario: pickers de color de fondo y texto, toggle "usar gradiente", inputs de texto y emoji, slider de altura. Verificá con tsc, lint y en /editor.
```

### PROMPT A2 — Separador decorativo (extender `divider`)

```
Extendé el bloque existente `divider` del email builder (app/) para que sea configurable. Hoy es una línea fija `1px solid #e5eaf0` (ver case 'divider' en app/src/lib/templates.ts ~línea 486, e interface `DividerBlockConfig` sin campos en app/src/lib/types.ts).

Campos nuevos en `DividerBlockConfig`:
- color?: string (#rrggbb, default '#e5eaf0')
- thickness?: number  // grosor px, clamp 1–8, default 1
- lineStyle?: 'solid' | 'dashed' | 'dotted'  // default 'solid'
- ornament?: string  // emoji/carácter centrado sobre la línea, ej. ✦ ● ✂

Render (modificar case 'divider' en templates.ts):
- Línea: `border-top:${thickness}px ${lineStyle} ${color}`.
- Si hay `ornament`: tabla de 3 celdas — línea izquierda (border-top) / celda central con el emoji (padding horizontal, sin borde) / línea derecha (border-top) — para que el emoji quede centrado partiendo la línea.
- Nota: dashed/dotted degradan a solid en Outlook, es aceptable.

Saneado (case 'divider' en app/src/lib/email-safety.ts sanitizeBlock; hoy cae en `default` — agregá un case explícito):
- color con `sanitizeColor`.
- thickness con `clampOpt(...,1,8)`.
- lineStyle: validar que sea uno de la lista, si no default 'solid'.
- ornament con `escapeHtml`.

Seguí las REGLAS OBLIGATORIAS (solo tablas, #rrggbb, escapeHtml). En CanvasEditor.tsx agregá al editor del divider: picker de color, slider de grosor, selector de estilo (solid/dashed/dotted) e input de ornamento. Verificá con tsc, lint y en /editor.
```

### PROMPT A3 — Bloque "Badge / Etiqueta" (`badge`)

```
Agregá un bloque nuevo `badge` al email builder (app/): una etiqueta tipo pill de color, corta y centrada, para destacar (ej. "OFERTA", "NUEVO", "🔥 HOT").

Campos (interface `BadgeBlockConfig extends BlockBase`, type 'badge'):
- text: string
- emoji?: string
- bgColor?: string (#rrggbb, default = accent del email)
- textColor?: string (#rrggbb, default '#ffffff')
- align?: 'left' | 'center' | 'right'  // default 'center'

Render (case 'badge' en app/src/lib/templates.ts renderCanvasBlock):
- Tabla con alineación `align`. Celda: `<td bgcolor="${bgColor}" style="padding:6px 16px;border-radius:100px;">` con `<span style="color:${textColor};font-weight:800;font-size:12px;letter-spacing:1px;text-transform:uppercase;font-family:...;">${emoji} ${text}</span>`.
- Outlook ignora border-radius → cae a rectángulo, aceptable. Poné `bgcolor` en el `<td>` para que Outlook pinte el fondo.

Saneado (case 'badge' en app/src/lib/email-safety.ts sanitizeBlock):
- bgColor/textColor con `sanitizeColor`.
- text/emoji con `escapeHtml`.
- align: validar contra la lista, default 'center'.

Seguí las REGLAS OBLIGATORIAS (solo tablas, #rrggbb, escapeHtml). Tocá los 5 lugares. En CanvasEditor.tsx: inputs de texto y emoji, pickers de color, selector de alineación. Verificá con tsc, lint y en /editor.
```

### PROMPT A4 — Bloque "Callout / Resaltado" (`callout`)

```
Agregá un bloque nuevo `callout` al email builder (app/): una caja de resaltado de propósito general (tip, aviso, garantía) con barra de acento lateral y fondo claro. Generaliza el `infobox` actual (que solo muestra fecha/hora).

Campos (interface `CalloutBlockConfig extends BlockBase`, type 'callout'):
- emoji?: string
- title?: string
- body?: string
- bgColor?: string (#rrggbb, default = lightenColor(accent, 85))
- accentColor?: string (#rrggbb, default = accent)  // barra lateral

Render (case 'callout' en app/src/lib/templates.ts renderCanvasBlock):
- Reutilizá el patrón de barra lateral de `renderQuote` (~línea 275): una tabla con dos celdas — `<td width="4" bgcolor="${accentColor}">` (la barra, NO uses border-left) y `<td style="background:${bgColor};padding:16px 20px;">` con el contenido.
- Contenido: si hay emoji, mostralo grande a la izquierda o antes del título. Título en negrita (color primary), body en color de cuerpo (`escapeTextWithBreaks` respeta saltos de línea).
- Podés inspirarte en el fondo/borde del case 'infobox' (~línea 436): `border:2px solid ${accentColor}33;border-radius:12px;`.

Saneado (case 'callout' en app/src/lib/email-safety.ts sanitizeBlock):
- bgColor/accentColor con `sanitizeColor`.
- emoji/title con `escapeHtml`, body con `escapeTextWithBreaks`.

Seguí las REGLAS OBLIGATORIAS (solo tablas, barra lateral con celda bgcolor, #rrggbb, escapeHtml). Tocá los 5 lugares. En CanvasEditor.tsx: inputs de emoji, título y body, pickers de color de fondo y acento. Verificá con tsc, lint y en /editor.
```

---

## GRUPO B — Emojis e iconos

### PROMPT B1 — Selector de emojis (solo UI)

```
Agregá un selector de emojis al editor del email builder (app/). Los emojis ya renderizan como texto Unicode en los emails, así que esto es SOLO UI: insertar un emoji en la posición del cursor del campo de texto enfocado. No toques app/src/lib/templates.ts ni email-safety.ts.

Qué construir:
- Componente nuevo app/src/components/EmojiPicker.tsx: un botón 😀 que abre un panel flotante con ~80 emojis curados agrupados por categoría (marketing/urgencia/dinero/positivos/flechas). Al hacer click en un emoji, llama un callback `onSelect(emoji)`.
- Integrarlo junto a los campos de texto de la pestaña "Contenido" en app/src/app/editor/page.tsx. Fijate en `renderInlineAiActions()` (~línea 958): seguí ese mismo patrón de botón-por-campo. La inserción debe respetar la posición del cursor (usar selectionStart/selectionEnd del input/textarea enfocado) y disparar el mismo onChange que ya usan esos campos, para no romper el estado.
- Integrarlo también en los editores de texto de bloque en app/src/components/CanvasEditor.tsx (`renderBlockEditor`, ~línea 212), al menos para los campos de texto/headline/body/bullets.

Sin dependencias externas pesadas: la lista de emojis es un array literal en el componente. Verificá con `npx tsc --noEmit` y `npm run lint`, y probá en /editor que insertar un emoji en un campo actualiza el preview del email.
```

### PROMPT B2 — Bullets con emoji personalizable (extender `bullets`)

```
Extendé el bloque `bullets` del email builder (app/) para que el marcador de viñeta sea personalizable con un emoji/carácter. Hoy usa un marcador fijo `&#8226;` en color accent (ver case 'bullets' en app/src/lib/templates.ts ~línea 424; interface `BulletsBlockConfig` en app/src/lib/types.ts ~línea 194).

Campos nuevos en `BulletsBlockConfig`:
- marker?: string  // emoji o carácter para TODOS los bullets; default '•'
- perBulletMarker?: string[]  // opcional: marcador distinto por bullet (por índice), ej. ['✅','✅','✅']. Si existe y tiene valor en ese índice, gana sobre `marker`.

Render (modificar case 'bullets' en templates.ts):
- Reemplazá el `<span style="color:${accent};...">&#8226;</span>` por el marcador elegido: `perBulletMarker[i]` si existe, si no `marker`, si no '•'. El marcador ya escapado. Si el marcador es un emoji, no le apliques el color accent (los emojis traen su propio color); si es un carácter tipo '•' o '›', mantené el color accent.

Saneado (modificar case 'bullets' en app/src/lib/email-safety.ts ~línea 96):
- marker con `escapeHtml`.
- perBulletMarker: `(block.perBulletMarker || []).map(escapeHtml)`.

Seguí las REGLAS OBLIGATORIAS (escapeHtml en todo texto). En CanvasEditor.tsx agregá al editor de bullets: un input para el marcador general (o un mini-picker de emoji si ya existe EmojiPicker). Verificá con tsc, lint y en /editor.
```

---

## GRUPO C — Botón CTA

### PROMPT C1 — Controles visuales del CTA (extender `cta` + `renderCTA`)

```
Dale control visual al botón CTA del email builder (app/). Hoy el CTA hereda el color accent y tiene radio/padding fijos (ver `renderCTA` en app/src/lib/templates.ts ~línea 296, y case 'cta' ~línea 467; interface `CtaBlockConfig` en app/src/lib/types.ts ~línea 213).

Campos nuevos en `CtaBlockConfig`:
- ctaBgColor?: string (#rrggbb, default = accent)
- ctaTextColor?: string (#rrggbb, default '#ffffff')
- ctaRadius?: number  // px, clamp 0–28, default 8
- ctaFullWidth?: boolean
- ctaSize?: 'sm' | 'md' | 'lg'  // mapea a padding y font-size: sm=10px/15px, md=15px/17px (actual), lg=18px/19px

Render (extender `renderCTA` para aceptar estos overrides como parámetros, y pasarlos desde el case 'cta'):
- IMPORTANTE Outlook: el radio vive en DOS lugares y ambos deben derivar de ctaRadius:
  1) el atributo `arcsize` del `<v:roundrect>` VML — arcsize es un porcentaje: aproximá `arcsize="${Math.round(ctaRadius/52*100)}%"` (52 = alto del botón) o un cálculo equivalente.
  2) el `border-radius` del `<a>` no-MSO.
- ctaBgColor va en `fillcolor` del v:roundrect y en `background` del `<a>`. ctaTextColor en el color del `<center>` MSO y del `<a>`.
- ctaFullWidth: en el `<a>` usar `display:block;text-align:center;` y width 100%; en el v:roundrect subir el `width` (ej. al ancho del email menos paddings).
- ctaSize mapea padding y font-size en ambos caminos (VML y `<a>`).
- Mantené intacto el fallback VML: no rompas el bloque `<!--[if mso]>...<![endif]-->`.

Saneado (modificar case 'cta' en app/src/lib/email-safety.ts ~línea 102):
- ctaBgColor/ctaTextColor con `sanitizeColor`.
- ctaRadius con `clampOpt(...,0,28)`.
- ctaSize: validar contra la lista, default 'md'.
- ctaFullWidth: booleano.

Seguí las REGLAS OBLIGATORIAS (fallback VML obligatorio, #rrggbb, no depender solo de border-radius). En app/src/components/CanvasEditor.tsx, editor del bloque CTA (~línea 379): agregá pickers de color de fondo y texto, slider de radio, toggle full-width y selector de tamaño. Verificá con tsc, lint y en /editor (revisá el HTML: el v:roundrect debe reflejar color, arcsize y width nuevos).
```

---

## GRUPO D — Unificar los dos editores (refactor, 3 fases)

> Hacer en orden, una fase por PR, verificando antes de seguir. Es un refactor sensible: afecta borradores e historial guardados.

### PROMPT D1 — Fuente única de verdad (`content.blocks[]`)

```
Refactor fase 1 en el email builder (app/). Problema: la pestaña "Contenido" del editor escribe campos legacy (content.hero, content.gallery, content.quote, content.bullets, etc.) y la pestaña "Canvas" escribe content.blocks[]; están desconectadas porque `legacyContentToBlocks()` (app/src/lib/email-document.ts ~línea 4) solo corre si blocks está vacío. Objetivo de esta fase: que `content.blocks[]` sea SIEMPRE la fuente de verdad.

Tareas:
- Al cargar o crear cualquier email en el editor (app/src/app/editor/page.tsx), garantizar que content.blocks[] esté poblado: si viene vacío, generarlo con `legacyContentToBlocks(content)`. Hacelo en el punto de carga (incluida la reapertura desde historial vía ?emailId=&brandId=, y la carga de borradores).
- Los emails viejos del historial/borradores deben migrarse al abrirse sin cambiar su apariencia. Apoyate en `normalizeEmailDocument` (email-document.ts ~línea 101) y `documentToContent` si aplica.
- Verificar que al GUARDAR (a historial y a borradores) los blocks[] se persistan y no se pierdan. Revisá app/src/lib/server/api-schemas.ts para confirmar que el schema de guardado acepta blocks[] completo.
- NO cambiar todavía la UI de la pestaña Contenido (eso es la fase 2). Esta fase solo asegura que blocks[] siempre exista y sea consistente.

Riesgo: compatibilidad hacia atrás. Verificación OBLIGATORIA: abrí un email viejo del historial (marca AMO, id mr761k2r7u67zwi2n) y confirmá que el HTML renderizado es idéntico antes y después del cambio. Corré `npx tsc --noEmit` y `npm run lint`. No debe cambiar el output visual de ningún email existente.
```

### PROMPT D2 — La pestaña "Contenido" opera sobre bloques

```
Refactor fase 2 en el email builder (app/). Requiere la fase 1 hecha (content.blocks[] siempre poblado). Objetivo: que la pestaña "Contenido" (app/src/app/editor/page.tsx) lea y escriba directamente los bloques de content.blocks[] en vez de los campos legacy (content.hero, content.gallery, content.quote, content.bullets, content.headline, etc.).

Tareas:
- Cada campo del formulario de "Contenido" debe mapear al bloque correspondiente dentro de blocks[] (buscar el bloque por type y/o id) y actualizar ESE bloque. El usuario sigue viendo un formulario simple; por debajo edita el modelo real de bloques.
- Agregar la capacidad de REORDENAR bloques desde la pestaña Contenido (hoy solo se puede en Canvas). Podés reutilizar la lógica de reordenamiento de app/src/components/CanvasEditor.tsx (`moveBlock`, handlers de drag ~línea 103-150).
- Exponer en la UI campos que ya existen en el modelo pero no tienen input hoy:
  - `subject` y `preheader` (app/src/lib/types.ts ~línea 273): agregar inputs (asunto y preheader del email).
  - CTA secundario (`secondaryCtaText`/`secondaryCtaUrl` del bloque cta): editable desde Contenido, no solo desde Canvas.
- Mantener sincronía: editar en Contenido y luego ir a Canvas (o al revés) debe mostrar el mismo estado, sin pisarse.

Riesgo medio-alto: es el grueso del refactor. Verificación: editar cada campo en Contenido y confirmar en el preview y en Canvas que el bloque correcto cambió; reordenar y confirmar el orden de render; guardar/reabrir y confirmar persistencia. `npx tsc --noEmit` y `npm run lint` sin errores nuevos.
```

### PROMPT D3 — Deprecar campos legacy

```
Refactor fase 3 (final) en el email builder (app/). Requiere fases 1 y 2 hechas (content.blocks[] es la fuente de verdad y la pestaña Contenido ya opera sobre bloques). Objetivo: eliminar la ruta de escritura duplicada de los campos legacy.

Tareas:
- Dejar los campos legacy de EmailContent (hero, imageText, gallery, quote, bullets, headline, body, label, ctaText, etc. en app/src/lib/types.ts) como SOLO-LECTURA para compatibilidad hacia atrás (lectura de emails viejos), pero que nada en la UI los escriba ya.
- Simplificar `legacyContentToBlocks` y `documentToContent` (app/src/lib/email-document.ts) para que solo se usen en la ruta de migración de datos viejos, no en la edición.
- Limpiar código muerto que quede: variables de estado legacy en el editor, handlers que ya no se usan.
- NO romper la lectura de borradores/historial existentes: los emails guardados con el formato viejo deben seguir abriéndose y viéndose igual.

Verificación: abrir varios emails viejos del historial de AMO y confirmar render idéntico; crear un email nuevo de cero y confirmar que funciona todo el flujo (generar IA, editar, guardar, reabrir, copiar HTML). `npx tsc --noEmit` y `npm run lint`. Confirmar que no quedaron referencias de escritura a los campos legacy fuera de la capa de migración.
```
