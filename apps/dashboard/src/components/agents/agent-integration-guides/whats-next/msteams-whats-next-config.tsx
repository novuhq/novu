import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { CodeBlock } from '@/components/primitives/code-block';
import { SetupButton } from '../../setup-guide-primitives';
import { MsTeamsDistribution } from './msteams-distribution';
import type { ChannelWhatsNextConfig, WhatsNextConfigContext } from './whats-next-types';

const TEAMS_ADMIN_CENTER_URL = 'https://admin.teams.microsoft.com/';
const MSTEAMS_REACT_PACKAGE = '@novu/react';

function escapeJsxAttributeValue(value: string): string {
  return value.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildMsTeamsConnectSnippet(
  integrationIdentifier: string,
  agentName: string,
  applicationIdentifier: string
): string {
  const safeApplicationIdentifier = escapeJsxAttributeValue(applicationIdentifier);
  const safeIntegrationIdentifier = escapeJsxAttributeValue(integrationIdentifier);
  const safeAgentName = escapeJsxAttributeValue(agentName);

  return `import { NovuProvider, MsTeamsConnectButton } from '${MSTEAMS_REACT_PACKAGE}';

// Wrap the button in a NovuProvider configured for the signed-in end user.
// Replace subscriberId with the current user's id (the connection is created per subscriber).
<NovuProvider
  applicationIdentifier="${safeApplicationIdentifier}"
  subscriberId="YOUR_SUBSCRIBER_ID"
>
  <MsTeamsConnectButton
    integrationIdentifier="${safeIntegrationIdentifier}"
    connectLabel="Install ${safeAgentName} \u2197"
    connectedLabel="Connected to MS Teams"
  />
</NovuProvider>;`;
}

function buildMsTeamsPrompt(integrationIdentifier: string, agentName: string, applicationIdentifier: string): string {
  return `Add the Novu MsTeamsConnectButton from @novu/react to my app so each of my end users can connect "${agentName}" to their own Microsoft Teams.

Context: I'm already signed in to the Novu dashboard and the "${agentName}" MS Teams integration already exists. This is purely a frontend code integration - do NOT run the Novu CLI, the agent-onboarding flow, or keyless mode.

Requirements:
- Install @novu/react with my project's package manager.
- Render <MsTeamsConnectButton /> inside a <NovuProvider> configured for the currently signed-in end user.
- Use applicationIdentifier="${applicationIdentifier}" and integrationIdentifier="${integrationIdentifier}" with connectionMode="subscriber". Store applicationIdentifier in an environment variable rather than hardcoding it.
- In subscriber mode each user gets their own connection, so pass the authenticated user's id as subscriberId; source it from my app's existing auth, don't hardcode it. autoLinkUser defaults to true in subscriber mode, so the per-user link is created automatically after admin consent.
- Follow my app's existing framework, routing, styling, and TypeScript conventions, place the button in a sensible spot in the UI, and add no unnecessary wrappers.

Optional reference: https://docs.novu.co/platform/integrations/chat/ms-teams`;
}

const APPLICATION_IDENTIFIER_PLACEHOLDER = '<YOUR_NOVU_APPLICATION_IDENTIFIER>';

export function buildMsTeamsWhatsNextConfig({
  agent,
  integrationLink,
  credentials,
  applicationIdentifier,
}: WhatsNextConfigContext): ChannelWhatsNextConfig {
  const integrationIdentifier = integrationLink.integration.identifier;
  const novuApplicationIdentifier = applicationIdentifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const connectSnippet = buildMsTeamsConnectSnippet(integrationIdentifier, agent.name, novuApplicationIdentifier);
  const prompt = buildMsTeamsPrompt(integrationIdentifier, agent.name, novuApplicationIdentifier);
  const azureAppId = typeof credentials?.clientId === 'string' ? credentials.clientId : undefined;

  return {
    recapSteps: [
      {
        title: 'Register the Azure app and bot',
        description:
          'You created an App Registration and Azure Bot, and enabled the Microsoft Teams channel so the agent can listen for messages.',
      },
      {
        title: 'Add the app credentials to the integration',
        description: 'The Microsoft App ID, Client Secret and Directory (tenant) ID were saved to this integration.',
      },
      {
        title: 'Upload the Teams app to your workspace',
        description: 'The Teams app package was uploaded so the bot is available in your workspace.',
      },
      {
        title: 'Connect and send your first message',
        description: 'You granted admin consent and verified the connection by messaging the agent in Teams.',
      },
    ],
    devSteps: [
      {
        sectionLabel: 'DISTRIBUTE YOUR BOT',
        title: 'Make the bot available to your users',
        description:
          "Your bot is connected in your own Microsoft 365 org. To reach more people across your org or your customers' orgs, make the same app available in each tenant. It's the same package and the same steps everywhere.",
        rightContent: <SetupButton href={TEAMS_ADMIN_CENTER_URL}>Open Teams Admin Center</SetupButton>,
        fullWidthContent: <MsTeamsDistribution appId={azureAppId} agentName={agent.name} />,
      },
      {
        title: (
          <span className="flex flex-wrap items-center gap-1.5">
            <span>Install</span>
            <code className="bg-bg-weak text-text-strong rounded px-1.5 py-0.5 font-code text-[12px]">
              {MSTEAMS_REACT_PACKAGE}
            </code>
          </span>
        ),
        description: `The NPM package ${MSTEAMS_REACT_PACKAGE} SDK to integrate Novu components in your application.`,
        headerSlot: <PrebuiltPromptBanner prompt={prompt} source="agent-channel-whats-next-msteams" />,
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={`npm install ${MSTEAMS_REACT_PACKAGE}`} language="shell" title="Terminal" />
          </div>
        ),
      },
      {
        title: 'Add MS Teams connect button to your application',
        description:
          'MsTeamsConnectButton is a pre-built UI component in the @novu/react SDK that connects an agent to a user\u2019s Microsoft Teams.',
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={connectSnippet} language="tsx" title="main.tsx" />
          </div>
        ),
      },
    ],
  };
}
