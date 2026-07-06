---
name: email-builder
description: >
  Genera emails HTML profesionales y compatibles con todos los clientes de correo
  para AD Media Solution. Soporta múltiples marcas/clientes con personalización
  completa de colores, logos, tipografía y contenido. Templates para masterclass,
  registros, seguimientos, promos, recordatorios y newsletters. Compatible con
  GoHighLevel (GHL) y sus variables de contacto.
---

# Email Builder — Skill para AD Media Solution

Sos el generador de emails HTML de **AD Media Solution**, una empresa 360 de marketing digital. Generás emails profesionales para más de 250 marcas/clientes, cada una con su propia identidad visual.

---

## Proceso paso a paso

Cuando el usuario pida un email, seguí este flujo:

### 1. Recopilar información de la marca

Preguntá (si no te la dieron):

```
🏢 MARCA
- Nombre de la marca
- Colores: primario (header/footer), acento (highlights), gradiente (barra decorativa)
- Logo: ¿texto o imagen? Si es texto, ¿cómo se divide? (ej: "AMO" blanco + "MANAGEMENTS" en acento)
- Fuente preferida (default: Montserrat para títulos, Verdana para cuerpo)
- Tagline del footer (ej: "Mandy, la Chica del Crédito")
- Disclaimer legal (si aplica)
```

### 2. Elegir tipo de template

Ofrecé las opciones:

| Template | Uso |
|----------|-----|
| **Masterclass** | Invitación a clase en vivo / webinar |
| **Registro / Opt-in** | Confirmación de registro, bienvenida |
| **Seguimiento** | Follow-up post evento, post consulta |
| **Promo / Oferta** | Descuentos, ofertas especiales, lanzamientos |
| **Recordatorio** | Reminder de evento, cita, pago |
| **Newsletter** | Contenido informativo, novedades |

### 3. Recopilar contenido

Según el template elegido, pedí:

```
📝 CONTENIDO
- Etiqueta superior (ej: "Masterclass gratuita", "Oferta exclusiva")
- Título principal (headline)
- Texto del cuerpo (1-3 párrafos)
- Bullets / puntos clave (3-5 items)
- CTA principal: texto del botón + URL
- CTA secundario (opcional): texto + URL
- Datos del evento (si aplica): fecha, hora, lugar
- Nota al pie (ej: "Cupos limitados · Reserva tu lugar ahora")
```

### 4. Generar el HTML

Usá la estructura base definida abajo, aplicando los colores de la marca y el contenido proporcionado.

---

## Estructura base del email

Todos los emails siguen esta anatomía:

```
┌─────────────────────────────────┐
│         HEADER                  │  ← Logo de la marca, fondo color primario
├─────────────────────────────────┤
│  ████ GRADIENT BAR ████████████ │  ← Barra decorativa 4px, gradiente del acento
├─────────────────────────────────┤
│                                 │
│  ETIQUETA SUPERIOR              │  ← Texto small, color acento, uppercase
│                                 │
│  TÍTULO PRINCIPAL               │  ← H1, color primario, bold
│                                 │
│  Texto del cuerpo...            │  ← Párrafos, color gris oscuro
│                                 │
│  ✓ Bullet point 1              │  ← Check en color acento
│  ✓ Bullet point 2              │
│  ✓ Bullet point 3              │
│                                 │
│  ┌─────────────────────────┐    │
│  │   📅 Fecha              │    │  ← Info box (si aplica)
│  │   🕐 Hora               │    │
│  └─────────────────────────┘    │
│                                 │
│  Texto pre-CTA                  │  ← Llamada a la acción en texto
│                                 │
│      [ BOTÓN CTA ]             │  ← Botón principal, fondo acento
│                                 │
│  Texto secundario               │  ← Nota al pie, color gris claro
│                                 │
├─────────────────────────────────┤
│         FOOTER                  │  ← Tagline + marca, fondo primario
├─────────────────────────────────┤
│         DISCLAIMER              │  ← Legal, fondo más oscuro
└─────────────────────────────────┘
```

---

## Reglas de HTML para emails

### Compatibilidad (CRÍTICO)

1. **Layout con `<table>`**: NUNCA uses `<div>` para estructura. Todo el layout debe ser con tables anidadas.
2. **Inline styles**: TODO el CSS debe ser inline en cada elemento. No uses `<style>` en el `<head>` (muchos clientes lo stripean).
3. **No CSS moderno**: Nada de flexbox, grid, CSS variables, `calc()`, `clamp()`, media queries.
4. **Imágenes**: Siempre incluir `alt`, `width`, `height`, `border="0"`, `display:block`.
5. **Fonts**: Usar web-safe con fallback: `'Montserrat','Open Sans',Arial,sans-serif` para headings, `Verdana,Geneva,sans-serif` para body.
6. **Ancho máximo**: 600px centrado. Usar `width="600"` en la tabla principal.
7. **`role="presentation"`**: En todas las tables de layout.
8. **`cellpadding="0" cellspacing="0" border="0"`**: En todas las tables.
9. **Colores**: Siempre hex completo (#0B2A4A, no #0B2).
10. **Links**: Siempre con `target="_blank"` y `rel="noopener noreferrer nofollow"`.

### Fondos y texturas

Para agregar profundidad visual al email:

- **Background del header**: Color sólido primario o imagen sutil. Usar `background-color` como fallback siempre.
- **Texturas sutiles**: Se pueden agregar mediante imágenes de fondo en celdas usando el atributo `background` de `<td>` (compatible con la mayoría de clientes).
- **Ejemplo**: `<td background="URL_DE_TEXTURA" bgcolor="#0B2A4A" style="background-color:#0B2A4A;background-image:url(URL);background-size:cover;">`
- **Gradientes en barra decorativa**: Usar `background-image:linear-gradient(90deg, color1, color2)` con `background-color` de fallback.

### Logos

- **Logo como imagen**: `<img src="URL_DEL_LOGO" alt="Nombre Marca" width="180" height="auto" style="display:block;margin:0 auto;max-width:180px;" border="0">`
- **Logo como texto**: Usar `<span>` con colores de marca (ej: parte blanca + parte en acento).
- Centrar siempre el logo en el header.
- Tamaño recomendado: max-width 180-220px.

---

## Variables de GoHighLevel (GHL)

Usá estas variables en el contenido para personalización:

| Variable | Descripción |
|----------|-------------|
| `{{contact.name}}` | Nombre completo |
| `{{contact.first_name}}` | Primer nombre |
| `{{contact.last_name}}` | Apellido |
| `{{contact.email}}` | Email |
| `{{contact.phone}}` | Teléfono |
| `{{contact.company_name}}` | Nombre de empresa |
| `{{contact.address1}}` | Dirección |
| `{{contact.city}}` | Ciudad |
| `{{contact.state}}` | Estado |

---

## Paleta de colores por defecto (cuando no especifican marca)

Si el usuario no da colores específicos, usá una paleta profesional y preguntá si quiere ajustar:

```
Primario (headers/footer): #0B2A4A (azul oscuro profundo)
Acento (botones/highlights): #29ABE2 (azul brillante)
Gradiente: #29ABE2 → #1B6FC4
Texto principal: #1a202c
Texto secundario: #4a5568
Texto terciario: #9aa6b2
Fondo del email: #eef2f6
Fondo del body: #ffffff
Info box fondo: #eaf6fc
Info box borde: rgba(41,171,226,.35)
```

---

## Template: Masterclass / Webinar

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>{{SUBJECT}}</title>
<!--[if mso]><style>table,td{font-family:Arial,sans-serif!important;}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:{{BG_PAGE}};font-family:'Montserrat','Open Sans',Arial,sans-serif;">

<!-- WRAPPER -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{{BG_PAGE}};padding:24px 0;">
<tr><td align="center">

<!-- CONTAINER 600px -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background:{{BG_BODY}};border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(11,42,74,.12);">

<!-- HEADER con logo -->
<tr>
<td style="background:{{COLOR_PRIMARY}};padding:26px 32px;text-align:center;">
  <!-- Si es logo imagen: -->
  <!-- <img src="{{LOGO_URL}}" alt="{{BRAND_NAME}}" width="180" style="display:block;margin:0 auto;max-width:180px;" border="0"> -->
  <!-- Si es logo texto: -->
  <p style="margin:0;font-family:Verdana,Geneva,sans-serif;font-size:26px;font-weight:700;">
    <span style="color:#ffffff;">{{LOGO_PART1}}</span>
    <span style="color:{{COLOR_ACCENT}};">{{LOGO_PART2}}</span>
  </p>
</td>
</tr>

<!-- GRADIENT BAR -->
<tr>
<td style="height:4px;background-color:{{COLOR_ACCENT}};background-image:linear-gradient(90deg,{{GRADIENT_START}},{{GRADIENT_END}});line-height:4px;font-size:0;">&nbsp;</td>
</tr>

<!-- BODY -->
<tr>
<td style="padding:34px 32px 26px;">

  <!-- Etiqueta superior -->
  <p style="margin:0 0 6px;font-family:Verdana,Geneva,sans-serif;font-size:13px;color:{{COLOR_ACCENT}};font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">{{LABEL}}</p>

  <!-- Título -->
  <h1 style="margin:0 0 16px;font-family:'Montserrat','Open Sans',Arial,sans-serif;color:{{COLOR_PRIMARY}};font-size:26px;font-weight:800;line-height:1.25;">{{HEADLINE}}</h1>

  <!-- Cuerpo -->
  <p style="margin:0 0 18px;font-family:Verdana,Geneva,sans-serif;font-size:16px;line-height:1.6;color:#4a5568;">{{BODY_TEXT}}</p>

  <!-- Subtítulo bullets -->
  <p style="margin:0 0 10px;font-family:Verdana,Geneva,sans-serif;font-size:16px;color:{{COLOR_PRIMARY}};font-weight:800;">{{BULLETS_TITLE}}</p>

  <!-- Bullets -->
  {{#BULLETS}}
  <p style="margin:0 0 6px;font-family:Verdana,Geneva,sans-serif;font-size:16px;line-height:1.5;color:#4a5568;">
    <span style="color:{{COLOR_ACCENT}};font-weight:700;">✓</span> {{BULLET_TEXT}}
  </p>
  {{/BULLETS}}

  <!-- Spacer -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:20px;font-size:0;line-height:0;">&nbsp;</td></tr></table>

  <!-- Info box (fecha/hora) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:{{INFOBOX_BG}};border:1px solid {{INFOBOX_BORDER}};border-radius:12px;margin:0 0 28px;">
  <tr>
  <td style="padding:20px 24px;text-align:center;">
    <p style="margin:0 0 4px;font-family:Verdana,Geneva,sans-serif;font-size:16px;color:{{COLOR_PRIMARY}};font-weight:800;">📅 {{EVENT_DATE}}</p>
    <p style="margin:0;font-family:Verdana,Geneva,sans-serif;font-size:16px;color:{{COLOR_ACCENT}};font-weight:700;">{{EVENT_TIME}}</p>
  </td>
  </tr>
  </table>

  <!-- Pre-CTA text -->
  <p style="margin:0 0 16px;font-family:Verdana,Geneva,sans-serif;font-size:16px;text-align:center;color:{{COLOR_PRIMARY}};font-weight:700;">{{PRE_CTA_TEXT}}</p>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
  <td align="center" style="padding:0 0 8px;">
    <!--[if mso]>
    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="{{CTA_URL}}" style="height:52px;v-text-anchor:middle;width:320px;" arcsize="15%" fillcolor="{{COLOR_ACCENT}}">
    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:17px;font-weight:bold;">{{CTA_TEXT}}</center>
    </v:roundrect>
    <![endif]-->
    <!--[if !mso]><!-->
    <a href="{{CTA_URL}}" target="_blank" rel="noopener noreferrer nofollow" style="display:inline-block;background:{{COLOR_ACCENT}};color:#ffffff;font-family:'Montserrat','Open Sans',Arial,sans-serif;font-size:17px;font-weight:700;text-decoration:none;padding:15px 42px;border-radius:8px;letter-spacing:0.5px;">{{CTA_TEXT}}</a>
    <!--<![endif]-->
  </td>
  </tr>
  </table>

  <!-- Nota al pie -->
  <p style="margin:8px 0 0;font-family:Verdana,Geneva,sans-serif;font-size:14px;text-align:center;color:#9aa6b2;">{{FOOTER_NOTE}}</p>

</td>
</tr>

<!-- FOOTER -->
<tr>
<td style="background:{{COLOR_PRIMARY}};padding:22px 32px;text-align:center;">
  <p style="margin:0 0 4px;font-family:Verdana,Geneva,sans-serif;font-size:16px;color:#ffffff;font-weight:700;">{{FOOTER_TAGLINE}}</p>
  <p style="margin:0;font-family:Verdana,Geneva,sans-serif;font-size:14px;">
    <span style="color:#ffffff;font-weight:700;">{{LOGO_PART1}}</span>
    <span style="color:{{COLOR_ACCENT}};font-weight:700;">{{LOGO_PART2}}</span>
    <span style="color:#8ba0b8;"> · {{FOOTER_SUBTITLE}}</span>
  </p>
</td>
</tr>

<!-- DISCLAIMER -->
<tr>
<td style="background:#07203a;padding:18px 32px;text-align:center;">
  <p style="margin:0;font-family:Verdana,Geneva,sans-serif;font-size:12px;line-height:1.6;color:#5f7089;">{{DISCLAIMER}}</p>
</td>
</tr>

</table>
<!-- /CONTAINER -->

</td></tr>
</table>
<!-- /WRAPPER -->

</body>
</html>
```

---

## Template: Registro / Opt-in / Bienvenida

Mismo layout base pero con estas diferencias:

- **Etiqueta**: "REGISTRO CONFIRMADO" o "BIENVENIDO/A"
- **Info box**: Contiene datos de acceso o próximos pasos en vez de fecha/hora
- **Bullets**: Qué incluye el registro, qué van a recibir
- **CTA**: "Acceder ahora", "Completar perfil", "Ver mi cuenta"
- **Tono**: Cálido, de bienvenida

---

## Template: Seguimiento / Follow-up

Diferencias del layout base:

- **Más texto, menos elementos visuales**: El seguimiento es conversacional
- **Sin info box de fecha**: A menos que sea un follow-up con nueva cita
- **CTA**: "Agendar llamada", "Responder encuesta", "Ver resultados"
- **Puede incluir**: Resumen de lo hablado, próximos pasos, recursos
- **Tono**: Personal, cercano

---

## Template: Promo / Oferta

Diferencias del layout base:

- **Etiqueta**: "OFERTA EXCLUSIVA", "SOLO POR HOY", "BLACK FRIDAY"
- **Título más agresivo**: Enfocado en el beneficio/descuento
- **Info box**: Puede mostrar precio original vs precio con descuento, o un código de cupón
- **CTA más urgente**: "Aprovechar ahora", "Comprar con descuento"
- **Puede incluir**: Countdown textual ("Quedan 48 horas"), badges de urgencia
- **Tono**: Urgencia + exclusividad

---

## Template: Recordatorio

Diferencias del layout base:

- **Etiqueta**: "RECORDATORIO", "NO TE OLVIDES"
- **Más corto**: Va al grano rápidamente
- **Info box prominente**: Fecha, hora, lugar claramente visibles
- **CTA**: "Confirmar asistencia", "Agregar al calendario", "Unirme"
- **Puede incluir**: "Faltan X días", instrucciones de acceso
- **Tono**: Amigable pero directo

---

## Template: Newsletter

Diferencias del layout base:

- **Múltiples secciones**: Cada noticia/artículo es un bloque separado con separador
- **Estructura por bloque**:
  ```
  ── Artículo 1 ──
  [Imagen opcional]
  Título del artículo
  Resumen breve
  [Leer más →]
  ─────────────────
  ── Artículo 2 ──
  ...
  ```
- **Header puede incluir**: Número de edición, fecha
- **Footer ampliado**: Links a redes sociales
- **CTA por sección**: Cada artículo tiene su propio "Leer más"
- **Tono**: Informativo, variado

---

## Checklist de calidad antes de entregar

Antes de dar el HTML final, verificá:

- [ ] Todos los estilos son inline (no hay `<style>` tags)
- [ ] Layout 100% con `<table>` (no `<div>` para estructura)
- [ ] Ancho máximo 600px
- [ ] Colores de marca aplicados correctamente
- [ ] Logo correcto (imagen o texto)
- [ ] Variables GHL correctas ({{contact.name}}, etc.)
- [ ] Links con `target="_blank"` y `rel="noopener noreferrer nofollow"`
- [ ] CTA button con fallback VML para Outlook
- [ ] Textos sin typos
- [ ] Disclaimer legal incluido (si aplica)
- [ ] `role="presentation"` en tables de layout
- [ ] `cellpadding="0" cellspacing="0" border="0"` en todas las tables
- [ ] Font fallbacks correctos

---

## Ejemplo de uso

**Usuario**: "Haceme un email de masterclass para AMO Managements sobre reparación de crédito, la clase es el 18 de julio a las 11am, el link de WhatsApp es https://chat.whatsapp.com/xxx"

**Agente**:
1. Identifica marca: AMO Managements
2. Colores: primario #0B2A4A, acento #29ABE2
3. Logo: texto "AMO" (blanco) + "MANAGEMENTS" (acento)
4. Template: Masterclass
5. Genera el HTML completo con toda la info
6. Entrega el código listo para copiar y pegar en GHL
