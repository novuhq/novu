# Reference — Channel "What's Next" (Layer-2) templates

Placeholders: `<Channel>` = PascalCase (`Discord`), `<channel>` = kebab/lower (`discord`).
All paths are under `apps/dashboard/src/components/agents/agent-integration-guides/`.

Pick the closest sibling to copy:
- **Telegram** — simplest; bot/deep-link, no workspace distribution step.
- **Slack** — workspace install + a "FOR YOUR USERS" distribution link built from `credentials`.
- **MS Teams** — org-wide distribution component + its own feature flag.

---

## 1. Config — `whats-next/<channel>-whats-next-config.tsx`

Copy `telegram-whats-next-config.tsx`. Build the snippet from the `@novu/react`
`<Channel>ConnectButton`, escape attribute values, and return recap + dev steps.

```tsx
import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { CodeBlock } from '@/components/primitives/code-block';
import type { ChannelWhatsNextConfig, WhatsNextConfigContext } from './whats-next-types';

const DISCORD_REACT_PACKAGE = '@novu/react';
const APPLICATION_IDENTIFIER_PLACEHOLDER = '<YOUR_NOVU_APPLICATION_IDENTIFIER>';

function escapeJsxStringAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildDiscordConnectSnippet(integrationIdentifier: string, applicationIdentifier: string): string {
  const app = escapeJsxStringAttributeValue(applicationIdentifier);
  const integration = escapeJsxStringAttributeValue(integrationIdentifier);

  return `import { NovuProvider, DiscordConnectButton } from '${DISCORD_REACT_PACKAGE}';

<NovuProvider applicationIdentifier="${app}" subscriberId="YOUR_SUBSCRIBER_ID">
  <DiscordConnectButton
    integrationIdentifier="${integration}"
    connectLabel="Connect Discord \u2197"
    connectedLabel="Connected to Discord"
  />
</NovuProvider>;`;
}

function buildDiscordPrompt(integrationIdentifier: string, agentName: string, applicationIdentifier: string): string {
  return `Add the Novu DiscordConnectButton from @novu/react to my app so each of my end users can connect "${agentName}" to their own Discord.

Context: I'm already signed in to the Novu dashboard and the "${agentName}" Discord integration already exists. This is purely a frontend code integration — do NOT run the Novu CLI, the agent-onboarding flow, or keyless mode.

Requirements:
- Install @novu/react with my project's package manager.
- Render <DiscordConnectButton /> inside a <NovuProvider> configured for the currently signed-in end user.
- Use applicationIdentifier="${applicationIdentifier}" and integrationIdentifier="${integrationIdentifier}". Store applicationIdentifier in an environment variable.
- Each user gets their own connection, so pass the authenticated user's id as subscriberId; source it from my app's existing auth.
- Follow my app's existing framework, routing, styling, and TypeScript conventions.`;
}

export function buildDiscordWhatsNextConfig({
  agent,
  integrationLink,
  applicationIdentifier,
}: WhatsNextConfigContext): ChannelWhatsNextConfig {
  const integrationIdentifier = integrationLink.integration.identifier;
  const appId = applicationIdentifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const connectSnippet = buildDiscordConnectSnippet(integrationIdentifier, appId);
  const prompt = buildDiscordPrompt(integrationIdentifier, agent.name, appId);

  return {
    recapSteps: [
      { title: 'Create a Discord app and bot', description: 'You created a Discord application and bot token.' },
      { title: 'Save the bot token to the integration', description: 'The bot token was saved to this integration.' },
      { title: 'Send a test message', description: 'You verified the agent can reach you on Discord.' },
    ],
    devSteps: [
      {
        sectionLabel: 'FOR YOUR USERS',
        title: (
          <span className="flex flex-wrap items-center gap-1.5">
            <span>Install</span>
            <code className="bg-bg-weak text-text-strong rounded px-1.5 py-0.5 font-code text-[12px]">
              {DISCORD_REACT_PACKAGE}
            </code>
          </span>
        ),
        description: `The NPM package ${DISCORD_REACT_PACKAGE} SDK to integrate Novu components in your application.`,
        headerSlot: <PrebuiltPromptBanner prompt={prompt} source="agent-channel-whats-next-discord" />,
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={`npm install ${DISCORD_REACT_PACKAGE}`} language="shell" title="Terminal" />
          </div>
        ),
      },
      {
        title: 'Add Discord connect button to your application',
        description:
          'DiscordConnectButton is a pre-built UI component in the @novu/react SDK that links a subscriber to your Discord bot.',
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={connectSnippet} language="tsx" title="main.tsx" />
          </div>
        ),
      },
    ],
  };
}
```

**Distribution variant** (Slack/MS Teams): add a first dev step with
`rightContent: <SetupButton href={...}>Enable …</SetupButton>` (import `SetupButton` from
`../../setup-guide-primitives`), building the URL from `credentials` (e.g. Slack `applicationId`,
MS Teams `clientId`). MS Teams also renders a `fullWidthContent: <MsTeamsDistribution .../>`.

---

## 2. Register the builder — `whats-next/whats-next-config.ts`

```ts
import { buildDiscordWhatsNextConfig } from './discord-whats-next-config';

const WHATS_NEXT_CONFIG_BUILDERS: Partial<Record<string, ChannelWhatsNextConfigBuilder>> = {
  // ...existing
  [ChatProviderIdEnum.Discord]: buildDiscordWhatsNextConfig,
};
```

`providerHasWhatsNextPhase` and `resolveChannelWhatsNextConfig` pick it up automatically.

---

## 3. Connected details — `<channel>-agent-connected-details.tsx`

Copy `telegram-agent-connected-details.tsx`. Wrap `AgentConnectedDetailsShell` and supply
provider credential sections via the render-prop. The shell renders the "What's next" guide.

```tsx
import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';
import type { AgentIntegrationLink, AgentResponse } from '@/api/agents';
import {
  AgentConnectedDetailsShell,
  DetailSection,
  FieldSkeleton,
  ReadOnlyField,
} from './agent-connected-details-shell';

type DiscordAgentConnectedDetailsProps = {
  agent: AgentResponse;
  integrationLink: AgentIntegrationLink;
  canRemoveIntegration: boolean;
  onRequestRemoveIntegration?: () => void;
  isRemovingIntegration?: boolean;
  justConnected?: boolean;
};

export function DiscordAgentConnectedDetails({
  agent,
  integrationLink,
  canRemoveIntegration,
  onRequestRemoveIntegration,
  isRemovingIntegration,
  justConnected = false,
}: DiscordAgentConnectedDetailsProps) {
  return (
    <AgentConnectedDetailsShell
      agent={agent}
      integrationLink={integrationLink}
      providerId={ChatProviderIdEnum.Discord}
      providerDisplayName="Discord"
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
      justConnected={justConnected}
    >
      {({ credentials, integrationName, isLoading }) => (
        <DiscordDetailSections
          credentials={credentials}
          isLoading={isLoading}
          botName={integrationName ?? integrationLink.integration.name}
        />
      )}
    </AgentConnectedDetailsShell>
  );
}

function DiscordDetailSections({
  credentials,
  isLoading,
  botName,
}: {
  credentials?: ICredentials;
  isLoading: boolean;
  botName: string;
}) {
  const botToken = (credentials?.apiToken as string | undefined) ?? '';

  return (
    <DetailSection title="Discord bot">
      <ReadOnlyField label="Bot name" value={botName} mono={false} info="Your connected Discord bot." />
      {isLoading ? <FieldSkeleton /> : <ReadOnlyField label="Bot Token" value={botToken} required secret />}
    </DetailSection>
  );
}
```

---

## 4. Wire the resolver — `resolve-agent-integration-guide.tsx`

Two switches need a new `case` (plus the imports):

```tsx
import { DiscordSetupGuide } from '@/components/agents/discord-setup-guide';      // layer-1 (prereq)
import { DiscordAgentConnectedDetails } from './discord-agent-connected-details';

// setup switch:
case ChatProviderIdEnum.Discord:
  setupGuide = <DiscordSetupGuide agent={agent} integrationId={integrationLink.integration._id} embedded />;
  setupDisplayName = 'Discord';
  break;

// renderConnectedView switch:
case ChatProviderIdEnum.Discord:
  return (
    <DiscordAgentConnectedDetails
      agent={agent}
      integrationLink={integrationLink}
      canRemoveIntegration={canRemoveIntegration}
      onRequestRemoveIntegration={onRequestRemoveIntegration}
      isRemovingIntegration={isRemovingIntegration}
      justConnected={justConnected}
    />
  );
```

---

## 5. Display name — `agent-provider-display-name.ts`

```ts
case ChatProviderIdEnum.Discord:
  return 'Discord';
```

---

## 6. Optional feature flag (independent rollout)

Mirror MS Teams. Add `IS_AGENT_DISCORD_WHATS_NEXT_ENABLED` to `FeatureFlagsKeysEnum`, then:

```tsx
// agent-connected-details-shell.tsx
const isDiscordWhatsNextEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_AGENT_DISCORD_WHATS_NEXT_ENABLED);
const showWhatsNext =
  providerId === ChatProviderIdEnum.Discord ? isDiscordWhatsNextEnabled : isWhatsNextEnabled;

// resolve-agent-integration-guide.tsx — extend hasUserRolloutPhase the same way.
```

Skip this entirely to ride the umbrella `IS_AGENT_WHATS_NEXT_ENABLED` flag.

---

## 7. Worked example — Discord (no dedicated flag)

```
Prereqs: ChatProviderIdEnum.Discord exists · discord-setup-guide.tsx exists · DiscordConnectButton in @novu/react.

Create:
  agent-integration-guides/whats-next/discord-whats-next-config.tsx
  agent-integration-guides/discord-agent-connected-details.tsx
Edit:
  agent-integration-guides/whats-next/whats-next-config.ts   (+register builder)
  agent-integration-guides/resolve-agent-integration-guide.tsx (+2 cases, +imports)
  agent-integration-guides/agent-provider-display-name.ts    (+case)
Verify: open a connected Discord integration → recap collapses, dev steps + prompt banner + snippet render,
        "Your users are connecting" footer appears after a real user connects. Types via diagnostics.
```

## Building blocks (import map)

| Symbol | From |
|---|---|
| `ChannelWhatsNextConfig`, `WhatsNextStep`, `WhatsNextConfigContext` | `whats-next/whats-next-types.ts` |
| `SetupStep`, `SetupButton`, `ListeningStatusView`, `CompletedStepIndicator` | `../../setup-guide-primitives` |
| `StepStatus` (`'completed' \| 'current' \| 'upcoming'`) | `../../setup-guide-step-utils` |
| `AgentConnectedDetailsShell`, `DetailSection`, `ReadOnlyField`, `FieldSkeleton` | `./agent-connected-details-shell` |
| `PrebuiltPromptBanner` | `@/components/onboarding/connect-agent/prebuilt-prompt-banner` |
| `CodeBlock` | `@/components/primitives/code-block` |
| `useChannelFirstConnectedEndpoint` | `@/hooks/use-channel-first-connected-endpoint` |
