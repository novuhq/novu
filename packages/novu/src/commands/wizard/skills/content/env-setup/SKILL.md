---
name: env-setup
description: Create or update Novu environment variables in the user's project safely (never expose the secret key to the client). Complements the official Novu skills by covering project-level env configuration.
triggers:
  - configure novu env vars
  - add novu keys to .env
  - secret key handling
---

# Novu environment setup

Apply this skill exactly once per project, before installing client snippets.

## Required variables

| Variable | Where it lives | Purpose |
|---|---|---|
| `NOVU_SECRET_KEY` | Server only | Auth for `@novu/api`, `@novu/framework`, MCP, CLI. |
| `NEXT_PUBLIC_NOVU_APPLICATION_IDENTIFIER` (Next.js) / `VITE_NOVU_APPLICATION_IDENTIFIER` (Vite) / `REACT_APP_NOVU_APPLICATION_IDENTIFIER` (CRA) | Client | Identifies the Novu application for the Inbox component. |

Optional:

- `NOVU_API_URL=https://eu.api.novu.co` for EU tenants.
- `NEXT_PUBLIC_NOVU_SUBSCRIBER_ID` (only for static / demo apps that don't have a real auth provider — never use this in production).

## Rules

1. **Never** prefix `NOVU_SECRET_KEY` with `NEXT_PUBLIC_*`, `VITE_*`, or `REACT_APP_*`. Doing so leaks it into the client bundle.
2. Add new variables to all of the project's env files: `.env.local`, `.env.example`, and (if present) deployment manifests like `vercel.json`, `netlify.toml`, or `fly.toml`.
3. Update `.gitignore` to ensure `.env.local` is ignored.
4. If the project uses `@t3-oss/env-nextjs` or similar typed env loaders, register the new keys in their schema.

## Verification checklist

- [ ] `.env.example` contains placeholder entries for every variable above.
- [ ] `.env.local` (or platform-specific equivalent) has real values.
- [ ] No `console.log` or telemetry call prints the secret key.
- [ ] Secret key does not appear in any file under `public/`, `src/components/`, or any client bundle entrypoint.
