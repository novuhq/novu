---
name: add-channel-whats-next-onboarding
description: >-
  Add a new chat channel's layer-2 dashboard onboarding — the connected-state
  "What's next" / "FOR YOUR USERS" developer-rollout guide plus its connected
  details page — in apps/dashboard, following the existing Slack, MS Teams, and
  Telegram pattern. Use when a connected agent integration needs a per-provider
  "what's next" guide (recap + dev steps with @novu/react ConnectButton snippet),
  a <Channel>AgentConnectedDetails view, and the resolver/registry wiring under
  components/agents/agent-integration-guides.
---

# Add a Channel's "What's Next" (Layer-2) Onboarding

Layer 2 = what a developer sees **after** their channel integration is connected: the
**"What's next" / "FOR YOUR USERS"** guide that helps them roll the agent out to their own
end users (install `@novu/react`, drop in the `<Channel>ConnectButton`), plus the connected
channel **details** page. Layer 1 (connecting the channel itself) is the separate
`<channel>-setup-guide.tsx` — out of scope here.

All files live in `apps/dashboard/src/components/agents/agent-integration-guides/`.

## Architecture

```
ResolveAgentIntegrationGuide            (switch on providerId — the registry)
        │
        ▼
AgentIntegrationGuideTransition         (setup ↔ connected; in-session "Continue" step)
        │
        ├─ setup view (LAYER 1) ──────  <Channel>SetupGuide   (prerequisite, separate skill)
        │
        └─ connected view (LAYER 2) ──  <Channel>AgentConnectedDetails
                                              │
                                              ▼
                                        AgentConnectedDetailsShell      (shared chrome + flag gate)
                                              ├─ AgentChannelWhatsNextGuide   (renders the config)
                                              │       └─ resolveChannelWhatsNextConfig → build<Channel>WhatsNextConfig
                                              └─ provider credential sections (children render-prop)
```

The guide is **data-driven**: each provider contributes a `build<Channel>WhatsNextConfig(ctx)`
that returns `{ recapSteps, devSteps }`. The shell and renderer never change.

## Step 0 — Prerequisites

Before adding layer 2, confirm:
- The channel has a `ChatProviderIdEnum` entry in `@novu/shared` (adding a brand-new provider id is `packages/providers` territory — ask first).
- A layer-1 `<channel>-setup-guide.tsx` exists (the connect-the-channel flow).
- A `<Channel>ConnectButton` exists in `@novu/react` (see the `add-channel-connect-button` skill) — the dev step embeds its snippet.

## File checklist

Copy the nearest sibling: **Telegram** = simplest (endpoint/deep-link), **Slack** = workspace + a distribution link, **MS Teams** = org distribution component + own feature flag. Full templates: see [reference.md](reference.md).

**Create**
- [ ] `whats-next/<channel>-whats-next-config.tsx` — `build<Channel>WhatsNextConfig(ctx): ChannelWhatsNextConfig`
- [ ] `<channel>-agent-connected-details.tsx` — `<Channel>AgentConnectedDetails` via `AgentConnectedDetailsShell`

**Edit**
- [ ] `whats-next/whats-next-config.ts` — register the builder in `WHATS_NEXT_CONFIG_BUILDERS[ChatProviderIdEnum.<Channel>]`
- [ ] `resolve-agent-integration-guide.tsx` — add a `case` to **both** switches: the setup `switch` (render `<Channel>SetupGuide`, set `setupDisplayName`) and `renderConnectedView` (render `<Channel>AgentConnectedDetails`)
- [ ] `agent-provider-display-name.ts` — add the display-name `case`

**Optional**
- [ ] Add `IS_AGENT_<CHANNEL>_WHATS_NEXT_ENABLED` only if this channel needs to ship independently of the umbrella flag (see Feature flags below).

## The config contract

`build<Channel>WhatsNextConfig(ctx: WhatsNextConfigContext): ChannelWhatsNextConfig`

- `ctx` → `{ agent, integrationLink, credentials?, applicationIdentifier? }`.
- Returns `{ recapSteps: WhatsNextStep[]; devSteps: WhatsNextStep[] }`.
- **recapSteps** mirror the completed layer-1 setup steps (title + description only); the renderer collapses them behind "Show all N instructions".
- **devSteps** are the new rollout steps. Convention: first dev step carries `sectionLabel: 'FOR YOUR USERS'` (or `'DISTRIBUTE YOUR BOT'` for org-level distribution), then **install `@novu/react`** (with a `PrebuiltPromptBanner` in `headerSlot`), then **add the `<Channel>ConnectButton` snippet** (`CodeBlock`).

`WhatsNextStep` fields: `title`, `description`, `sectionLabel?`, `headerSlot?`, `rightContent?`, `extraContent?`, `fullWidthContent?`, `status?` (`'completed' | 'current' | 'upcoming'`).

The renderer flips each dev step to `completed` once a real end-user connection exists
(`useChannelFirstConnectedEndpoint`) and shows the "Your users are connecting" footer.

## Feature flags

- Default: the guide rides the umbrella `IS_AGENT_WHATS_NEXT_ENABLED` flag — no flag work needed.
- Independent rollout (like MS Teams): add `IS_AGENT_<CHANNEL>_WHATS_NEXT_ENABLED`, then gate it in two places — `AgentConnectedDetailsShell.showWhatsNext` and `ResolveAgentIntegrationGuide.hasUserRolloutPhase`. `providerHasWhatsNextPhase(providerId)` already returns true once the builder is registered.

## Conventions & gotchas

- The config file is the only place with provider-specific copy/snippets. Keep the shell, transition, and renderer untouched.
- **Escape JSX attribute values** in the connect snippet (each sibling has an escape helper) and source `applicationIdentifier` from the environment with a `<YOUR_NOVU_APPLICATION_IDENTIFIER>` fallback; `integrationIdentifier` comes from `integrationLink.integration.identifier`.
- `PrebuiltPromptBanner` `source` must be unique: `agent-channel-whats-next-<channel>`.
- Connected details: pull credentials from the shell's `children` render-prop `{ credentials, integrationName, isLoading }`; surface only safe fields with `ReadOnlyField` (mark secrets `secret`, never expose internal webhook secrets).
- Don't confuse this with `agent-whats-next-section.tsx` (the Overview-tab summary card) — that's a separate, simpler surface.
- Dashboard conventions: TanStack Query for server state, Radix/shadcn + Tailwind (no inline `style` except dynamic values), React Router. Novu conventions: `type` (not `interface`) on the frontend, named exports, blank line before every `return`, no nested ternaries.

## Build & verify

1. Do **not** build/start the dashboard — it runs on port 4201. Check types via Cursor diagnostics.
2. Open a connected `<Channel>` integration's detail page; confirm the recap collapses, the dev steps render with a working prompt banner + copyable snippet, and the "Your users are connecting" footer appears once a real user connects.
3. If you added a per-provider flag, verify the guide hides when it's off.
