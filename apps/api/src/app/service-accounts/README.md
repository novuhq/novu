# API Keys v2

Opt-in credential system alongside legacy environment-embedded API keys.

## Authentication

- Header unchanged: `Authorization: ApiKey <key>`
- Legacy keys: bare 32-char hex (unchanged behavior, god-mode permissions)
- v2 keys: `nv_<tier>_<region>_<random>` (`sk` = env-scoped SA, `sa` = org-scoped SA)
- Org-scoped v2 keys require `Novu-Environment-Id` for data-plane endpoints

## Enable

Set `IS_API_KEYS_V2_ENABLED=true` or enable the LaunchDarkly flag. Then:

1. `POST /v1/signing-secrets/enable-v2` — seeds signing secrets from legacy key
2. Create service accounts and keys via `/v1/service-accounts`

## Management API

- `GET/POST /v1/service-accounts`
- `GET/POST /v1/service-accounts/:id/keys`
- `POST /v1/service-accounts/:id/keys/:keyId/revoke|rotate`
- `GET/POST /v1/signing-secrets`
