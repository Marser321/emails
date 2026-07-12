---
name: email-builder-flow-qa
description: Test, diagnose, and iteratively improve the AD Media Email Builder flow. Use when Codex needs to run the app QA loop, investigate broken generation, transparent logos, history persistence, export, authentication, responsive behavior, console or network errors, regressions, or production-readiness checks in this repository.
---

# Email Builder Flow QA

Run a reproducible evidence-first loop against `app/`. Diagnose before changing code and only implement fixes when the user authorized changes.

## Execute the loop

1. Read `references/flow-matrix.md` and select the smallest matrix that covers the request.
2. Inspect `git status` and preserve unrelated user changes.
3. Run `node .agents/skills/email-builder-flow-qa/scripts/run-flow-loop.mjs --quick` while iterating.
4. Reproduce failures with the narrowest unit or Playwright test. Preserve the trace, screenshot, console error, failed request, or assertion as evidence.
5. Classify each failure as product code, test fixture, environment, provider quota, authentication, data migration, or visual regression.
6. If fixes are authorized, change one coherent failure group, run the targeted test, then repeat the quick loop.
7. Before handoff or deployment, run `node .agents/skills/email-builder-flow-qa/scripts/run-flow-loop.mjs --full`.
8. Read the generated report in `app/test-results/flow-qa-report.md`. Do not mark the app ready while a required gate is red.

## Live provider checks

Run live AI calls only when explicitly requested and safe for quota/data handling:

```text
node .agents/skills/email-builder-flow-qa/scripts/run-flow-loop.mjs --live
```

Require server-only provider keys. Never print, copy, persist, or include key values in reports. Send only non-sensitive marketing prompts to free tiers.

## Live GHL embed check

After deploying a preview with `EMAILBUILDER_EMBED_TOKEN`, run the dedicated smoke without placing the token in command arguments or reports:

```text
node --env-file=app/.env.local .agents/skills/email-builder-flow-qa/scripts/smoke-embed.mjs https://preview.example.com
```

## Live team password check

After deploying a preview with `EMAILBUILDER_TEAM_PASSWORD`, run the dedicated smoke without placing the password in command arguments or reports:

```text
node --env-file=app/.env.local .agents/skills/email-builder-flow-qa/scripts/smoke-team-password.mjs https://preview.example.com
```

## Guardrails

- Keep deterministic E2E tests mocked; keep real-provider smoke tests opt-in.
- Never approve a visual snapshot merely because it changed. Inspect the actual, expected, and diff images first.
- Verify transparent logos from decoded output metadata, not file extension.
- Treat generation success without a persisted history entry as a degraded failure.
- Verify a reopened history entry matches the latest saved subject, blocks, styles, and HTML.
- Keep production protected by Supabase Auth, a valid GHL embed session, or a valid team password session; confirm anonymous and invalid-session API requests return 401.
- For GHL embeds, verify the token stays in the URL fragment, the clean URL has no token, and the session cookie is HttpOnly, Secure, SameSite=None, and Partitioned.
- For direct access, verify the shared password stays server-only and the derived session cookie is HttpOnly, Secure, and SameSite=Lax.
- Stop and report environment blockers separately from code defects.
