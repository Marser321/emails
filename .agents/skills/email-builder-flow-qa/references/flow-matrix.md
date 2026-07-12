# Email Builder flow matrix

## Required release gates

| Area | Required evidence |
| --- | --- |
| Static | ESLint and TypeScript exit 0 |
| Unit | All Vitest suites pass, including providers and image processing |
| Functional | Playwright generation, history, duplicate, logo, editor, and responsive flows pass |
| Visual | Deterministic snapshots pass after inspecting intentional diffs |
| Build | Next.js production build exits 0 |
| Supply chain | Production dependency audit reports no unresolved vulnerability |

## Core flows

### AI generation

1. Load server provider availability without exposing credentials.
2. Select only a configured engine.
3. Generate a schema-valid document and render it.
4. Surface authentication, timeout, invalid JSON, and quota failures clearly.
5. Record the actual engine and model in history.

### Transparent brand logo

1. Upload PNG/WebP as `kind=logo`.
2. Decode and normalize to PNG without flattening alpha.
3. Store `has_alpha=true` when appropriate.
4. Preview on light, dark, and checkerboard surfaces.
5. Render the public asset URL in exported email HTML.
6. Reject SVG and invalid/oversized files.

### History

1. Save generated structured content plus initial HTML.
2. Show the entry and thumbnail without a page reload.
3. Edit the subject and blocks; wait for autosave confirmation.
4. Reload the entry and compare the restored content.
5. Rate and copy the entry.
6. Duplicate it and confirm later edits do not mutate the source entry.

### Security and production

1. Confirm private pages redirect unauthenticated users, while a valid GHL embed session opens without login.
2. Confirm private APIs return 401 without a Supabase or GHL embed session.
3. Confirm asset reads are public but writes require authentication.
4. Confirm no `NEXT_PUBLIC_` secret and no secret values in logs or reports.
5. Confirm dev bypass, unrestricted open access, and Ethereal are disabled in production.
6. Confirm the GHL token is exchanged from a URL fragment, removed before navigation, stored only as a derived HttpOnly partitioned cookie, and cross-origin writes return 403.

## Failure classification

- **Product:** deterministic reproduction in app code.
- **Fixture:** test depends on real time, data, network, fonts, or ordering.
- **Environment:** missing runtime, browser, database migration, or deployment access.
- **Provider:** invalid key, quota, regional restriction, timeout, or model deprecation.
- **Data:** schema mismatch, RLS, stale record, or failed migration.
- **Visual:** layout or rendering differs after deterministic state is established.
