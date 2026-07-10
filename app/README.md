# Email Builder profesional

Builder privado de emails para AD Media y AMO. Usa Next.js 16, Supabase Auth/RLS, un documento canónico `EmailDocumentV3` y un renderer de tablas/VML compatible con clientes de correo.

## Desarrollo local

1. Copia `.env.example` a `.env.local` y completa las variables necesarias.
2. Instala y verifica:

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

`EMAILBUILDER_AUTH_BYPASS=true` solo funciona fuera de producción. Sin Supabase configurado, la aplicación puede compilar y usar los JSON locales para desarrollo; los proveedores de IA y SMTP permanecen deshabilitados hasta que existan sus secretos.

## Assets y datos

```bash
npm run assets:build
npm run icons:build
npm run assets:seed
npm run data:migrate
```

`data:migrate` es un dry run que crea un respaldo sanitizado. La escritura requiere `npm run data:migrate -- --apply`, `SUPABASE_SERVICE_ROLE_KEY` y autorización operativa explícita.

Consulta [la auditoría](docs/audit-2026-07.md) y [el runbook de despliegue](docs/deployment-runbook.md) antes de aplicar cambios live.
