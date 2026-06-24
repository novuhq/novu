import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { CodeBlock } from '@/components/primitives/code-block';
import { SetupButton } from '../../setup-guide-primitives';
import type { ChannelWhatsNextConfig, WhatsNextConfigContext } from './whats-next-types';

const SLACK_APPS_BASE_URL = 'https://api.slack.com/apps';
const SLACK_REACT_PACKAGE = '@novu/react';

function buildManageSlackAppUrl(applicationId: string | undefined): string {
  return applicationId ? `${SLACK_APPS_BASE_URL}/${applicationId}/distribute` : SLACK_APPS_BASE_URL;
}

function buildSlackConnectSnippet(integrationIdentifier: string, agentName: string): string {
  return `import { NovuProvider, SlackConnectButton } from '${SLACK_REACT_PACKAGE}';

// Wrap the button in a NovuProvider configured for the signed-in end user.
// Replace the placeholders with your Novu application identifier and the
// current user's subscriberId (the connection is created per subscriber).
<NovuProvider
  applicationIdentifier="<YOUR_NOVU_APPLICATION_IDENTIFIER>"
  subscriberId="<SUBSCRIBER_ID>"
>
  <SlackConnectButton
    integrationIdentifier="${integrationIdentifier}"
    connectLabel="Install ${agentName} \u2197"
    connectedLabel="Connected to Slack"
  />
</NovuProvider>;`;
}

function buildSlackPrompt(integrationIdentifier: string, agentName: string): string {
  return `I'm signed in to the Novu dashboard. Help me add the @novu/react SlackConnectButton to my app so my users can connect "${agentName}" to their Slack workspace. Use integration identifier "${integrationIdentifier}" and connectionMode="subscriber". Follow instructions from https://novu.co/agents.md`;
}

export function buildSlackWhatsNextConfig({
  agent,
  integrationLink,
  credentials,
}: WhatsNextConfigContext): ChannelWhatsNextConfig {
  const applicationId = (credentials?.applicationId as string | undefined) ?? '';
  const integrationIdentifier = integrationLink.integration.identifier;
  const manageSlackAppUrl = buildManageSlackAppUrl(applicationId);
  const connectSnippet = buildSlackConnectSnippet(integrationIdentifier, agent.name);
  const prompt = buildSlackPrompt(integrationIdentifier, agent.name);

  return {
    recapSteps: [
      {
        title: 'Create Slack App',
        description: 'You created a Slack app from the pre-filled manifest and connected it to this integration.',
      },
      {
        title: 'Add the app credentials to the integration',
        description: 'The App ID, Client ID, Client Secret and Signing Secret were saved to this integration.',
      },
      {
        title: 'Install the app to your workspace',
        description: 'The Slack app was installed to your workspace so the agent can listen for messages.',
      },
      {
        title: 'Send your first message',
        description: 'You verified the connection by sending the agent its first message in Slack.',
      },
    ],
    devSteps: [
      {
        sectionLabel: 'FOR YOUR USERS',
        title: 'Enable Slack Public Distribution',
        description:
          'Your app only works in your own workspace by default. External users are blocked until you enable this.',
        extraContent: <SetupButton href={manageSlackAppUrl}>Enable Slack App</SetupButton>,
      },
      {
        title: (
          <span className="flex flex-wrap items-center gap-1.5">
            <span>Install</span>
            <code className="bg-bg-weak text-text-strong rounded px-1.5 py-0.5 font-code text-[12px]">
              {SLACK_REACT_PACKAGE}
            </code>
          </span>
        ),
        description: `The NPM package ${SLACK_REACT_PACKAGE} SDK to integrate Novu components in your application.`,
        headerSlot: <PrebuiltPromptBanner prompt={prompt} source="agent-channel-whats-next-slack" />,
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={`npm install ${SLACK_REACT_PACKAGE}`} language="shell" title="Terminal" />
          </div>
        ),
      },
      {
        title: 'Add Slack connect button to your application',
        description:
          'SlackConnectButton is a pre-built UI component in the @novu/react SDK that connects an agent to a Slack workspace.',
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={connectSnippet} language="tsx" title="main.tsx" />
          </div>
        ),
      },
    ],
  };
}
