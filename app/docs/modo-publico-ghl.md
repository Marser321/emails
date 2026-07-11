# Modo público — embeber el Email Builder en GHL (sin login)

Permite servir la app **sin login**, como iframe dentro de GHL, para que todo el
equipo la use. Es un **workspace único compartido**: todos ven y editan las
mismas marcas, historial y borradores.

> ⚠️ **Riesgo aceptado:** en modo público, cualquiera con la URL puede usar los
> botones de IA, que consumen las API keys de Gemini/Anthropic (cuestan dinero).
> Ver "Tope de gasto" al final para el backstop recomendado (sin fricción).

## Cómo funciona

Cuando `EMAILBUILDER_OPEN_ACCESS=true`:

1. **Middleware** (`src/proxy.ts`): no redirige a `/login`; deja pasar todo.
2. **Auth** (`src/lib/server/auth.ts`): `requireUser()` devuelve un usuario de
   sistema (`open-access`) en vez de exigir sesión de Supabase.
3. **Base de datos** (`src/lib/supabase/server.ts`): el servidor usa la
   **service-role key** (saltea RLS). Esa key vive solo en el servidor, nunca se
   expone al navegador. Por eso NO hace falta abrir la RLS a `anon`.
4. **created_by**: como el usuario de sistema no es un UUID real, `toUuidOrNull`
   lo guarda como `null` (evita romper la FK a `auth.users`).
5. **iframe**: `next.config.ts` emite `Content-Security-Policy: frame-ancestors *`
   para que GHL pueda enmarcar la app.
6. **UI**: se oculta el botón "Cerrar sesión" (`NEXT_PUBLIC_OPEN_ACCESS=true`).

Sin la env var, la app mantiene el comportamiento privado con login (default seguro).

## Variables de entorno en Vercel (Production)

| Variable | Valor | Notas |
|---|---|---|
| `EMAILBUILDER_OPEN_ACCESS` | `true` | Activa el modo público (servidor) |
| `NEXT_PUBLIC_OPEN_ACCESS` | `true` | Oculta la UI de login (cliente) |
| `SUPABASE_SERVICE_ROLE_KEY` | *(la key de servicio)* | **Ya debe existir**; obligatoria en este modo. Nunca con prefijo `NEXT_PUBLIC_` |
| `EMAILBUILDER_FRAME_ANCESTORS` | *(opcional)* | Para acotar el iframe a dominios GHL concretos en vez de `*` |

Las de Supabase públicas (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
siguen siendo necesarias.

Tras setear las variables, **redeploy** en Vercel para que tomen efecto.

## Embeber en GHL

1. En GHL: **Sites → Custom Menu Link** (o un iframe en un Custom Page/Funnel).
2. URL: la de producción en Vercel (ej. `https://app-xxxx.vercel.app`).
3. Tipo: iframe / "Open in iframe".
4. Al abrir el menú, la app carga directo, sin pedir login.

Si GHL usa dominio white-label propio y querés acotar el framing, poné ese
dominio en `EMAILBUILDER_FRAME_ANCESTORS` (ej.
`https://app.gohighlevel.com https://*.leadconnectorhq.com https://tu-dominio.com`).

## Volver a modo privado

Borrar (o poner en `false`) `EMAILBUILDER_OPEN_ACCESS` y `NEXT_PUBLIC_OPEN_ACCESS`
en Vercel y redeploy. Vuelve el login por magic link. La RLS nunca se tocó, así
que la protección a nivel base de datos sigue intacta.

## Tope de gasto de IA (recomendado, sin fricción)

Como el acceso queda abierto, poné un límite duro del lado del proveedor —
no afecta la experiencia del usuario:

- **Anthropic**: Console → Billing → *Usage limits* / spend cap mensual + alertas.
- **Google Gemini**: en Google Cloud, cuota de la API + *Budget & alerts*.

Así, si alguien abusa de la URL, el gasto tiene techo.
