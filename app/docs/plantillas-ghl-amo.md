# Plantillas GHL — AMO Managements (Mandy, la Chica del Crédito)

Funnel de la masterclass del **18 de julio, 11:00 AM (hora Miami)** y post-venta.
Voz: Mandy — cercana, directa, primera persona, enseña antes de vender.

## Cómo usar este documento

- **WhatsApp**: cada plantilla indica su **categoría de Meta** (`utility` o `marketing`). Las variables son numeradas `{{1}}`, `{{2}}`… (así las exige Meta/GHL al registrar la plantilla). El mapeo de cada variable está debajo de cada mensaje. Enviar a aprobación cuanto antes: Meta tarda 24–48 h.
- **SMS**: usan merge fields de GHL directamente (`{{contact.first_name}}`). Mantener bajo ~300 caracteres (2 segmentos máx).
- **Email**: los 6 emails de recordatorio ya están en el historial de AMO en la app; acá solo va el copy de los 6 nuevos (pagos y seguimiento), que también están cargados en la app para editar el diseño.

### Links pendientes (reemplazar en GHL antes de activar)

| Placeholder | Qué es |
|---|---|
| `{{custom_values.masterclass_link}}` | Link de Zoom de la masterclass |
| `{{custom_values.offers_link}}` | Página de ofertas / checkout |
| `{{custom_values.academy_link}}` | Acceso a Mandy Academy |

---

# 1. Recordatorios de masterclass (espejo de los emails ya creados)

## 1.1 — 3 días antes

**WhatsApp** · categoría: `utility` (recordatorio de evento registrado)

> Hola {{1}} 👋 Soy Mandy. Te escribo porque en 3 días tenemos nuestra masterclass en vivo sobre cómo limpiar tu crédito legalmente — colecciones, charge-offs, pagos tardíos y más.
>
> 📅 {{2}} a las {{3}}
>
> Es 100% gratis y en vivo. Guarda este link para entrar: {{4}}
>
> Nos vemos ahí 💙

Variables: `{{1}}` nombre · `{{2}}` fecha (18 de julio) · `{{3}}` hora (11:00 AM Miami) · `{{4}}` link Zoom

**SMS**

> Hola {{contact.first_name}}, soy Mandy 👋 En 3 días es nuestra masterclass EN VIVO para limpiar tu crédito legalmente. 18 de julio, 11 AM (Miami). Guarda tu acceso: {{custom_values.masterclass_link}}

## 1.2 — 2 días antes (tip de valor)

**WhatsApp** · categoría: `utility`

> {{1}}, un tip gratis antes de la masterclass del {{2}}: mantener la utilización de tus tarjetas por debajo del 10% es de lo que más rápido mueve tu puntaje — y solo depende de ti. 📈
>
> En la clase te muestro cómo combinar esto con disputas avanzadas para que tu reporte cambie de verdad.
>
> Tu acceso: {{3}}

Variables: `{{1}}` nombre · `{{2}}` fecha · `{{3}}` link Zoom

**SMS**

> {{contact.first_name}}, tip de Mandy: mantén tus tarjetas bajo el 10% de uso — es gratis y sube tu puntaje. El viernes 18 a las 11 AM (Miami) te enseño el sistema completo en vivo: {{custom_values.masterclass_link}}

## 1.3 — 24 horas antes (bono del vivo)

**WhatsApp** · categoría: `utility`

> {{1}}, ¡mañana nos vemos! 🙌 Masterclass en vivo, {{2}} a las {{3}}.
>
> Vas a salir con un plan claro para limpiar tu reporte. Y algo más: por estar en vivo conmigo vas a recibir un bono especial que solo anuncio durante la clase — no está en la grabación.
>
> Ten a mano tu reporte de crédito si lo tienes, y tus preguntas listas. Tu acceso: {{4}}

Variables: `{{1}}` nombre · `{{2}}` fecha · `{{3}}` hora · `{{4}}` link Zoom

**SMS**

> {{contact.first_name}}, ¡es MAÑANA! Masterclass en vivo 11 AM (Miami). Por estar en vivo recibes un bono que no se repite en la grabación. Guarda tu link: {{custom_values.masterclass_link}} — Mandy

## 1.4 — 1 hora antes

**WhatsApp** · categoría: `utility`

> {{1}}, en 1 hora abro la sesión en vivo ⏰
>
> Vamos a hablar de cómo eliminar legalmente colecciones, charge-offs y pagos tardíos de tu reporte — y solo para quienes estén en vivo, una oferta especial que no vas a ver en ningún otro lado.
>
> Entra unos minutos antes: {{2}}

Variables: `{{1}}` nombre · `{{2}}` link Zoom

**SMS**

> {{contact.first_name}}, en 1 HORA empezamos la masterclass en vivo. No llegues tarde — hay oferta especial solo para los que estén conectados: {{custom_values.masterclass_link}} — Mandy

## 1.5 — 5 minutos antes

**WhatsApp** · categoría: `utility`

> {{1}}, ¡ya estamos empezando! 🔴 Entra ahora, no te pierdas ni un segundo: {{2}}

Variables: `{{1}}` nombre · `{{2}}` link Zoom

**SMS**

> ¡{{contact.first_name}}, empezamos en 5 minutos! Entra YA: {{custom_values.masterclass_link}} — Mandy 🔴

## 1.6 — 30 min después de iniciada (no entraron)

**WhatsApp** · categoría: `marketing` (contiene oferta)

> {{1}}, ¿no pudiste entrar? Todavía estás a tiempo 🔴
>
> Ahora mismo estoy presentando EN VIVO las ofertas exclusivas: 7 días gratis de Mandy Academy y revisión de tu crédito por $1 (regular $100).
>
> Se termina cuando cierre la transmisión. Entra ahora: {{2}}

Variables: `{{1}}` nombre · `{{2}}` link Zoom

**SMS**

> {{contact.first_name}}, sigo EN VIVO presentando las ofertas: 7 días gratis de Mandy Academy + revisión de crédito por $1. Termina al cerrar la transmisión: {{custom_values.masterclass_link}}

---

# 2. Pago fallido

**Email** (en el historial de AMO en la app)

- **Subject:** Tu pago no se procesó — pero tu cupo sigue reservado
- **Preheader:** Inténtalo con otro método de pago, toma 1 minuto
- **Cuerpo:** ver app (historial AMO) — invita a reintentar con otra tarjeta/método y pasa el link de la página de ofertas.

**WhatsApp** · categoría: `utility` (aviso transaccional de pago)

> Hola {{1}}, soy Mandy. Tu pago no se pudo procesar 😕 — a veces pasa con la tarjeta o el banco, no te preocupes.
>
> Tu cupo sigue reservado por ahora. Puedes intentarlo de nuevo con otra tarjeta u otro método de pago aquí: {{2}}
>
> Si necesitas ayuda con el pago, respóndeme por aquí y te asisto personalmente 💙

Variables: `{{1}}` nombre · `{{2}}` link página de ofertas

**SMS**

> {{contact.first_name}}, tu pago no se procesó 😕 Tu cupo sigue reservado — inténtalo con otra tarjeta u otro método aquí: {{custom_values.offers_link}} ¿Dudas? Responde este mensaje. — Mandy

# 3. Pago exitoso

**Email** (en el historial de AMO en la app)

- **Subject:** ¡Felicidades! Tu pago fue confirmado 🎉
- **Preheader:** Bienvenida/o — esto es lo que sigue
- **Cuerpo:** ver app — felicita, confirma el pago y explica los próximos pasos (acceso, qué esperar).

**WhatsApp** · categoría: `utility` (confirmación de transacción)

> ¡{{1}}, felicidades! 🎉 Tu pago fue confirmado.
>
> Acabas de dar el paso que la mayoría pospone por años: tomar control de tu crédito. Estoy orgullosa de ti.
>
> Tu acceso está aquí: {{2}}
>
> Cualquier duda me escribes por aquí. Nos vemos adentro 💙 — Mandy

Variables: `{{1}}` nombre · `{{2}}` link de acceso (Academy/servicio)

**SMS**

> ¡{{contact.first_name}}, tu pago fue confirmado! 🎉 Bienvenida/o. Tu acceso: {{custom_values.academy_link}} — Cualquier duda respóndeme. Orgullosa de ti. — Mandy

---

# 4. Seguimiento post-masterclass (asistieron, no compraron)

> Estos cuatro toques van por las 3 vías. En WhatsApp son categoría **marketing** (Meta no aprueba venta como utility).

## 4.1 — D+1 (recap + oferta sigue abierta)

**Email** (en la app): Subject "Lo que aprendiste ayer no sirve de nada si no lo aplicas"

**WhatsApp** · `marketing`

> {{1}}, ¡gracias por acompañarme ayer en la masterclass! 💙
>
> Ahora ya sabes que tu crédito SÍ se puede arreglar legalmente. La pregunta es: ¿lo vas a hacer?
>
> Te dejé la puerta abierta un poco más: el acceso a Mandy Academy y la revisión de tu crédito siguen disponibles hoy aquí: {{2}}
>
> No es magia, es un sistema — y ya viste cómo funciona.

Variables: `{{1}}` nombre · `{{2}}` link ofertas

**SMS**

> {{contact.first_name}}, ayer viste que tu crédito SÍ se puede arreglar legalmente. La oferta de la masterclass sigue abierta hoy: {{custom_values.offers_link}} No es magia, es un sistema. — Mandy

## 4.2 — D+2 (objeciones)

**Email** (en la app): Subject "«No tengo tiempo / no me va a funcionar» — hablemos de eso"

**WhatsApp** · `marketing`

> {{1}}, sé lo que estás pensando: "¿y si no me funciona a mí?" 🤔
>
> Mis clientes empezaron igual — con colecciones, charge-offs, hasta bancarrotas. La diferencia no fue suerte: fue seguir el sistema paso a paso.
>
> En Mandy Academy tienes los videos, las plantillas de disputa y mi acompañamiento. Empieza hoy: {{2}}

Variables: `{{1}}` nombre · `{{2}}` link ofertas

**SMS**

> {{contact.first_name}}, ¿"y si no me funciona"? Mis clientes empezaron con el crédito peor que el tuyo. La diferencia: siguieron el sistema. Empieza hoy: {{custom_values.offers_link}} — Mandy

## 4.3 — D+3 (lo que se llevan / prueba social)

**Email** (en la app): Subject "Esto es todo lo que te llevas al entrar hoy"

**WhatsApp** · `marketing`

> {{1}}, esto es lo que tienes esperándote dentro de Mandy Academy:
>
> ✅ Eliminar colecciones, charge-offs y pagos tardíos
> ✅ Disputas avanzadas nivel experto
> ✅ Reconstruir tu crédito desde cero (tradelines, rent reporting, Experian Boost)
> ✅ Eliminar bancarrotas, repos y desalojos
> ✅ Crédito empresarial para tu negocio
>
> Todo paso a paso, a tu ritmo: {{2}}

Variables: `{{1}}` nombre · `{{2}}` link ofertas

**SMS**

> {{contact.first_name}}, dentro de la Academy: eliminar colecciones y charge-offs, disputas avanzadas, reconstruir desde cero y crédito empresarial. Todo paso a paso: {{custom_values.offers_link}} — Mandy

## 4.4 — D+5 (última llamada)

**Email** (en la app): Subject "Última llamada: la oferta de la masterclass cierra hoy"

**WhatsApp** · `marketing`

> {{1}}, esta es mi última llamada 📢
>
> Hoy cierra la oferta especial de la masterclass. Después de hoy, el precio y los bonos vuelven a la normalidad.
>
> Puedes seguir cargando ese reporte de crédito un año más… o empezar a limpiarlo esta misma noche.
>
> Tú decides — pero decide hoy: {{2}}
>
> Con cariño, Mandy 💙

Variables: `{{1}}` nombre · `{{2}}` link ofertas

**SMS**

> {{contact.first_name}}, ÚLTIMA LLAMADA: hoy cierra la oferta de la masterclass. Después de hoy, precio y bonos vuelven a la normalidad. Decide hoy: {{custom_values.offers_link}} — Mandy

---

## Checklist de activación en GHL

- [ ] Registrar las 12 plantillas de WhatsApp en Meta (vía GHL) con su categoría correcta
- [ ] Reemplazar `{{custom_values.masterclass_link}}`, `{{custom_values.offers_link}}` y `{{custom_values.academy_link}}` por los links reales
- [ ] Mapear variables `{{1}}`, `{{2}}`… a los custom values / merge fields de GHL en cada workflow
- [ ] Configurar los triggers: registro → recordatorios; pago fallido/exitoso → transaccionales; asistió-sin-comprar → secuencia D+1/D+2/D+3/D+5
- [ ] Exportar el HTML de los emails desde la app (historial de AMO en `/editor`)
