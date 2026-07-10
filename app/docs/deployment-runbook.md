# Runbook de despliegue

## Principios

- No aplicar cambios live sin autorización explícita y una ventana de rollback.
- No copiar secretos a archivos, tickets, logs ni tablas. Rotar cualquier clave que haya residido en `settings`.
- Desplegar primero código compatible y eliminar columnas de claves después.

## 1. Preparar secretos y usuarios

1. Configurar en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `GEMINI_API_KEY`, `ANTHROPIC_API_KEY` y las variables SMTP necesarias.
2. Mantener `SUPABASE_SERVICE_ROLE_KEY` fuera del runtime web; usarla solo desde una estación operativa para migración y seed.
3. Configurar en Supabase la URL del sitio y `/auth/callback` como redirect permitido.
4. Crear/invitar previamente cada usuario interno en Supabase Auth. La app usa magic link con `shouldCreateUser: false`.
5. Confirmar que `EMAILBUILDER_AUTH_BYPASS` y `EMAILBUILDER_ENABLE_ETHEREAL` no existen en producción.

## 2. Respaldo y despliegue compatible

1. Ejecutar `npm run data:migrate` localmente. Revisar el resumen y custodiar el archivo de `backups/`; se excluye de Git y elimina campos con aspecto de secreto.
2. Registrar solamente si Gemini/Claude estaban configurados; no exportar sus valores. Rotar esas claves en sus proveedores.
3. Desplegar este código sin ejecutar todavía la sentencia que elimina columnas legacy.
4. Verificar `/login`, callback PKCE, logout, redirect de páginas privadas y 401 de APIs anónimas.

## 3. Migrar datos y endurecer RLS

1. Aplicar `supabase/schema.sql` en Supabase SQL Editor. Es idempotente y activa RLS, índices y políticas de Storage.
2. Con las variables operativas cargadas, ejecutar `npm run data:migrate -- --apply`. Opcionalmente definir `MIGRATION_CREATED_BY` con el UUID del usuario custodio.
3. Ejecutar `npm run assets:seed` para publicar/upsertar el starter pack.
4. Repetir `supabase/schema.sql` para confirmar idempotencia y verificar que `gemini_api_key` y `anthropic_api_key` ya no existen.

## Verificaciones de seguridad

- Una sesión anónima no puede seleccionar ni mutar `brands`, `history`, `drafts`, `settings` o `assets`.
- Una imagen del bucket público puede leerse sin sesión, pero insert/update/delete requieren `authenticated`.
- Todas las APIs privadas responden 401 sin usuario; las páginas privadas redirigen a `/login`.
- Upload rechaza más de 8 MB, MIME no permitido y archivos que Sharp no puede decodificar.
- La UI muestra “configurado/no configurado”, nunca el valor de un secreto.

## Smoke test y matriz de correo

1. Crear una marca, editar el footer GHL, subir una imagen, generar, guardar, reabrir y exportar.
2. Enviar desde GHL las 9 plantillas de AD Media y AMO.
3. Revisar Gmail web/móvil, Apple Mail, Outlook clásico/365/web y Yahoo en desktop/mobile y dark mode.
4. Confirmar CTA VML, stacking, fondos fallback, alt text, `{{unsubscribe}}`, `{{location.full_address}}` y merge fields de contacto.

## Rollback

Revertir primero el despliegue de aplicación. Las columnas de claves no deben restaurarse; reconfigurar secretos en el entorno. Los upserts de marcas/drafts/history son repetibles y el respaldo sanitizado permite reconstruir datos no sensibles. Las políticas anteriores de escritura pública no deben reinstalarse.
