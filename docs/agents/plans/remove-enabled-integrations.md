# Plan: Remove Tool-step `enabledIntegrations`

## Goal

Remove the Tool-channel step control `enabledIntegrations` (integration-identifier filter) and all related UI, schema, DTO, sanitize, render, and worker filtering logic. After removal, Tool steps always deliver to **all active Tool integrations** in the environment (previous empty/undefined behavior).

## Out of scope

- `enabledProviders` in `libs/maily-core` (editor suggestion providers) — different concept; leave untouched.
- `libs/internal-sdk` — auto-generated; do not edit.
- DB migration — not required (see Compat).

## Files / symbols to change

### Delete

| Path | Symbol / reason |
|------|-----------------|
| `apps/dashboard/src/components/workflow-editor/steps/tool/tool-enabled-providers.tsx` | `ToolEnabledProviders` — UI-only for this control |

### Dashboard

| Path | Change |
|------|--------|
| `apps/dashboard/src/components/workflow-editor/steps/configure-step-form.tsx` | Remove `ToolEnabledProviders` import/usage; remove `showToolFormMiddleSection`; remove TOOL branch that defaults `enabledIntegrations` in `registerInlineControlValues` |

### Schemas / DTOs / sanitize

| Path | Change |
|------|--------|
| `libs/application-generic/src/schemas/control/tool-control.schema.ts` | Remove `enabledIntegrations` from `toolControlZodSchema` |
| `libs/application-generic/src/schemas/control/tool-control.schema.spec.ts` | Drop `enabledIntegrations` from fixtures |
| `libs/application-generic/src/dtos/workflow/tool-control.dto.ts` | Remove field + validators |
| `libs/application-generic/src/utils/sanitize-control-values.ts` | Stop mapping `enabledIntegrations` in `sanitizeTool` (strips key on save/normalize) |
| `packages/framework/src/schemas/steps/channels/tool.schema.ts` | Remove from `toolOutputSchema.properties` |
| `packages/framework/src/schemas/steps/channels/tool.schema.test.ts` | Update expectation |
| `packages/shared/src/dto/workflows/preview-step-response.dto.ts` | Remove from `ToolRenderOutput` |

### API / Worker

| Path | Change |
|------|--------|
| `apps/api/src/app/environments-v1/usecases/output-renderers/tool-output-renderer.usecase.ts` | Stop copying `enabledIntegrations` into output |
| `apps/worker/src/app/workflow/usecases/send-message/send-message-tool.usecase.ts` | Remove `filterToolIntegrationsByEnabledIdentifiers`, `ToolStepOutputs.enabledIntegrations`, filter call, and `requestedEnabledIntegrations` / `enabled_integrations_filter_matched_none` failure details; use all active integrations; simplify `resolveContentAndProviders` to return `{ content }` only |
| `apps/worker/src/app/workflow/usecases/send-message/send-message-tool.usecase.spec.ts` | Remove the `enabledIntegrations filter` describe block |

## Compat / migration notes

- Persisted workflow step control values may still contain `enabledIntegrations`.
- Prefer **no DB migration**:
  - `sanitizeTool` only copies known keys → next normalize/save strips the field.
  - Worker ignores the key after removal (always uses active integrations).
  - Zod/JSON schema is `.strict()` / `additionalProperties: false` → if raw validation runs before sanitize, the stale key may surface as a step-issue until the workflow is re-saved. Acceptable; matches existing unknown-key handling.
- In-flight bridge outputs that still include the key: framework output schema will reject unknown properties if validated; renderer no longer emits it. Low risk for new traffic.

## Verification

1. Ripgrep confirms no Tool-channel `enabledIntegrations` / `ToolEnabledProviders` / `filterToolIntegrationsByEnabledIdentifiers` remain (except intentional non-Tool `enabledProviders` in maily-core).
2. Unit tests:
   - `apps/worker` — `send-message-tool.usecase.spec.ts`
   - `libs/application-generic` — `tool-control.schema.spec.ts`
   - `packages/framework` — `tool.schema.test.ts`
3. Manual (optional): open a Tool step in dashboard — "Enabled Providers" UI gone; send still fans out to all active Tool integrations.
