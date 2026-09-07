---
name: add-channel-setup-guide
description: >-
  Add a new chat channel's layer-1 setup guide — the in-dashboard
  <Channel>SetupGuide that walks a developer through connecting the channel
  itself (create app/bot → save credentials → install/verify → send first
  message) with live connection detection — in apps/dashboard, following the
  existing Slack, MS Teams, and Telegram guides. Use when a new agent channel
  needs its numbered setup stepper, credential drawer wiring, and connectedAt
  polling under components/agents.
---

# Add a Channel's Setup Guide (Layer 1)

Layer 1 = connecting the **channel itself**: the numbered stepper a developer follows to
create the provider app/bot, save its credentials in Novu, install/verify, and send a first
message — with a live "Listening… / Connected" indicator. `ResolveAgentIntegrationGuide`
renders this `<Channel>SetupGuide` as the **setup view** until the integration is connected,
then swaps to the connected/"what's next" view (separate `add-channel-whats-next-onboarding` skill).

Files live in `apps/dashboard/src/components/agents/`. Siblings: `slack-setup-guide.tsx` (quick/manual
modes + manifest), `teams-setup-guide.tsx`, `telegram-setup-guide.tsx` (simplest), `whatsapp-setup-guide.tsx`.

## How it works

```
<Channel>SetupGuide
  ├─ useFetchIntegrations()         → find integration by _id + providerId
  ├─ SetupStepperRail
  │    └─ SetupStep × N             → create app · save creds · install/verify
  │         └─ SetupButton / IntegrationCredentialsSidebar trigger
  ├─ ListeningStatus                → polls listAgentIntegrations every 1s;
  │                                    fires onConnected + confetti when connectedAt is set
  └─ IntegrationCredentialsSidebar  → generic credential save (useUpdateIntegration)
```

**Connection is detected, not asserted.** A channel is "connected" only when the backend sets
`connectedAt` on the integration link (on the first real inbound message). Saving credentials or
finishing OAuth/install does **not** mean connected — keep those as separate local states.

## Building blocks

All from `setup-guide-primitives.tsx` and `setup-guide-step-utils.ts`:

| Symbol | Role |
|---|---|
| `SetupStepperRail` | Vertical numbered rail wrapping the steps column |
| `SetupStep` | One step: `index`, `status`, `title`, `description`, `rightContent?`, `extraContent?`, `fullWidthContent?`, `headerSlot?`, `dimmed?`, `sectionLabel?`, `inlineSectionLabel?` |
| `SetupButton` | Secondary outline action; `href` opens a new tab, else `onClick`; supports `leadingIcon`, `disabled` |
| `SetupModeToggle` + `SetupMode` (`'quick' \| 'manual'`) | Optional dual-path setup (Slack) |
| `IntegrationCredentialsSidebar` | Drawer that saves provider credentials via the generic integration form; `onSaveSuccess`, `agentOnboarding` |
| `ListeningStatus` | Polls `listAgentIntegrations`; fires `onConnected` + confetti on `connectedAt` |
| `deriveStepStatus(i, firstIncomplete)` | → `'completed' \| 'current' \| 'upcoming'` |
| `hasIntegrationCredentials(credentials)` | True once any string credential is saved |

## Step 0 — Prerequisites

- `ChatProviderIdEnum.<Channel>` exists in `@novu/shared`, and the provider exists in `packages/providers` (brand-new providers are ask-first).
- The integration can be created/selected (the "add provider" flow passes you an `integrationId`).

## File checklist

Copy the closest sibling, then rename. Full template: see [reference.md](reference.md).

- [ ] CREATE `apps/dashboard/src/components/agents/<channel>-setup-guide.tsx` — export `<Channel>SetupGuide`
- [ ] EDIT `agent-integration-guides/resolve-agent-integration-guide.tsx` — in the setup `switch`, render `<Channel>SetupGuide ... embedded />` and set `setupDisplayName` (the `add-channel-whats-next-onboarding` skill covers the rest of this resolver)
- [ ] *(optional)* Add a provider-specific server action in `@/api/agents` or `@/api/integrations` only if the channel needs webhook registration / quick-setup / subscriber-link beyond a plain credential save

## Component contract

Props: `{ agent: AgentResponse; integrationId: string; stepOffset?: number; onStepsCompleted?: () => void; embedded?: boolean }`
(`stepOffset` defaults to 1; Overview mounts the guide at a higher base, the Integrations detail page at 1).

State machine:
1. Resolve `selectedIntegration` from `useFetchIntegrations()` by `_id === integrationId && providerId === ChatProviderIdEnum.<Channel>`.
2. Track progress: `hasIntegrationCredentials(...)` ‖ a local `credentialsSavedLocally`, plus any install/connected flags. Reset all of it in `useEffect([integrationId])`.
3. Derive `const base = stepOffset` → compute `firstIncompleteStep` → `deriveStepStatus(stepIndex, firstIncompleteStep)` per `SetupStep`.
4. Render the steps in `SetupStepperRail`, then `ListeningStatus` (in a `pl-8` wrapper), then `IntegrationCredentialsSidebar`.
5. `ListeningStatus.onConnected` → mark connected and call `onStepsCompleted?.()`.
6. Provide both an `embedded` return (no Overview chrome — used by the resolver) and the standalone return.

## Typical 3-step recipe

1. **Create the app/bot** — `SetupButton href=` the provider console. Optional: a manifest (`CodeBlock`, escape injected values) or a quick-setup input that calls a server action.
2. **Save credentials in Novu** — `SetupButton onClick={() => setIsCredentialsSidebarOpen(true)}`; the sidebar's `onSaveSuccess` flips `credentialsSavedLocally` (and may trigger a provider action like webhook registration).
3. **Install / verify + send first message** — a provider connect button or copyable instructions; `ListeningStatus` watches for `connectedAt`.

## Conventions & gotchas

- Keep **installed/credentialed** and **connected** as distinct states — only `connectedAt` advances the final step (see the Slack guide's comments).
- Server state through TanStack Query; after a mutation, invalidate `getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier)`.
- Escape any value injected into a manifest/snippet (e.g. Slack YAML double-quoted strings).
- Reset local state when `integrationId` changes so switching integrations doesn't leak progress.
- Novu/dashboard conventions: `type` (not `interface`) on the frontend, named exports, blank line before every `return`, no nested ternaries, animations from `motion/react`. Don't build/start the dashboard (port 4201) — check types via diagnostics.

## Build & verify

1. Don't start the dashboard — check types via Cursor diagnostics.
2. From the agent Integrations tab, add/open a `<Channel>` integration: confirm steps advance as credentials save, the credential drawer opens/saves, and "Listening…" flips to "Connected" with confetti once a real message lands.
