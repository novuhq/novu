# Reference — Channel Setup Guide (Layer-1) template

Placeholders: `<Channel>` = PascalCase (`Discord`), `<channel>` = kebab/lower (`discord`).
Path: `apps/dashboard/src/components/agents/<channel>-setup-guide.tsx`.

Copy the closest sibling:
- **Telegram** (`telegram-setup-guide.tsx`) — simplest: create bot → save token → send test. Best starting point.
- **Slack** (`slack-setup-guide.tsx`) — adds `SetupModeToggle` (quick vs manual) + a generated manifest.
- **MS Teams** (`teams-setup-guide.tsx`) — multi-credential Azure flow.

---

## Skeleton — `<channel>-setup-guide.tsx`

```tsx
import { ChatProviderIdEnum } from '@novu/shared';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiKey2Line } from 'react-icons/ri';
import type { AgentResponse } from '@/api/agents';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import {
  IntegrationCredentialsSidebar,
  ListeningStatus,
  SetupButton,
  SetupStep,
  SetupStepperRail,
} from './setup-guide-primitives';
import { deriveStepStatus, hasIntegrationCredentials } from './setup-guide-step-utils';

export type DiscordSetupGuideProps = {
  agent: AgentResponse;
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
};

export function DiscordSetupGuide({
  agent,
  integrationId,
  stepOffset = 1,
  onStepsCompleted,
  embedded = false,
}: DiscordSetupGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const [isCredentialsSidebarOpen, setIsCredentialsSidebarOpen] = useState(false);
  const [credentialsSavedLocally, setCredentialsSavedLocally] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Reset progress when the watched integration changes.
  useEffect(() => {
    setIsConnected(false);
    setCredentialsSavedLocally(false);
  }, [integrationId]);

  const { integrations } = useFetchIntegrations();
  const selectedIntegration = useMemo(
    () => integrations?.find((i) => i._id === integrationId && i.providerId === ChatProviderIdEnum.Discord),
    [integrations, integrationId]
  );

  const isCredentialsSaved = hasIntegrationCredentials(selectedIntegration?.credentials) || credentialsSavedLocally;

  const base = stepOffset;
  const firstIncompleteStep = useMemo(() => {
    if (isConnected) return base + 2;
    if (isCredentialsSaved) return base + 1;

    return base;
  }, [base, isCredentialsSaved, isConnected]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
    onStepsCompleted?.();
  }, [onStepsCompleted]);

  const stepsColumn = (
    <>
      <SetupStep
        index={base}
        status={deriveStepStatus(base, firstIncompleteStep)}
        title="Create a Discord app and bot"
        description="Create an application in the Discord Developer Portal, add a bot, and copy its token."
        rightContent={<SetupButton href="https://discord.com/developers/applications">Open Discord Portal</SetupButton>}
      />

      <SetupStep
        index={base + 1}
        status={deriveStepStatus(base + 1, firstIncompleteStep)}
        title="Save the bot token in Novu"
        description="Open the credentials form and paste the bot token."
        rightContent={
          <SetupButton leadingIcon={<RiKey2Line className="size-3.5" />} onClick={() => setIsCredentialsSidebarOpen(true)}>
            Configure credentials
          </SetupButton>
        }
      />

      <SetupStep
        index={base + 2}
        status={deriveStepStatus(base + 2, firstIncompleteStep)}
        dimmed={!isCredentialsSaved}
        title="Send a test message"
        description="Message your bot on Discord — your agent should respond."
      />
    </>
  );

  const listening = (
    <ListeningStatus
      agentIdentifier={agent.identifier}
      watchedIntegrationId={integrationId}
      onConnected={handleConnected}
      connectedMessage="Discord is connected — your agent is ready to receive messages."
      listeningMessage="Send a message to your bot on Discord to finish connecting."
    />
  );

  const sidebar = (
    <IntegrationCredentialsSidebar
      integrationId={integrationId}
      isOpen={isCredentialsSidebarOpen}
      onClose={() => setIsCredentialsSidebarOpen(false)}
      onSaveSuccess={() => setCredentialsSavedLocally(true)}
      agentOnboarding
    />
  );

  if (embedded) {
    return (
      <div className="flex flex-col gap-0">
        <SetupStepperRail className="py-6 pb-3 pr-3 md:pr-6">{stepsColumn}</SetupStepperRail>
        <div className="pl-8">{listening}</div>
        {sidebar}
      </div>
    );
  }

  return (
    <>
      <SetupStepperRail>{stepsColumn}</SetupStepperRail>
      <div className="pl-8">{listening}</div>
      {sidebar}
    </>
  );
}
```

---

## Optional add-ons (by sibling)

**Quick vs manual mode (Slack).** Add `const [setupMode, setSetupMode] = useState<SetupMode>('quick')`, render
`<SetupModeToggle mode={setupMode} onChange={setSetupMode} />` (typically gated by a feature flag), and switch
between two `stepsColumn` variants.

**Generated manifest (Slack).** Build a YAML string (escape double-quoted values), render it with
`<CodeBlock language="shell" title="…-manifest.yaml" />` inside `fullWidthContent`, and deep-link the provider
console with the manifest in the query string.

**Provider server action (Telegram/Slack).** After credentials save, call a `@/api/agents` /
`@/api/integrations` helper via `useMutation` (e.g. register a webhook, run quick setup, issue a subscriber
deep-link), then `queryClient.invalidateQueries({ queryKey: getAgentIntegrationsQueryKey(currentEnvironment?._id, agent.identifier) })`.
Wire it from the sidebar's `onSaveSuccess`.

**Embedded credential extras (Telegram).** `IntegrationCredentialsSidebar` accepts `agentIdentifier` and
`testSubscriberId` to render provider-specific paste UI (e.g. the Telegram mobile QR) and a `submitLabel`.

---

## Wire the resolver — `agent-integration-guides/resolve-agent-integration-guide.tsx`

Add to the **setup** `switch` (the connected-view wiring is covered by `add-channel-whats-next-onboarding`):

```tsx
import { DiscordSetupGuide } from '@/components/agents/discord-setup-guide';

case ChatProviderIdEnum.Discord:
  setupGuide = <DiscordSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
  setupDisplayName = 'Discord';
  break;
```

---

## Worked example — Discord

```
Prereqs: ChatProviderIdEnum.Discord exists · Discord provider in packages/providers.

Create:
  apps/dashboard/src/components/agents/discord-setup-guide.tsx
Edit:
  agent-integration-guides/resolve-agent-integration-guide.tsx   (+setup-switch case, +import)
Verify: open a non-connected Discord integration → 3 steps, save token via drawer, "Listening…" → "Connected"
        on first inbound message. Types via diagnostics.
```

## Connection-detection note

`ListeningStatus` polls `listAgentIntegrations` every second and only treats the channel as connected when the
matching link's `connectedAt` is set by the backend. Do **not** wire `onConnected` to credential-save or
OAuth-install callbacks — those are earlier, separate states. This mirrors the Slack guide, which keeps
`isSlackAppInstalled` (OAuth done) distinct from workspace-connected (first real message received).
