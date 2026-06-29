import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { CodeBlock } from '@/components/primitives/code-block';
import type { ChannelWhatsNextConfig, WhatsNextConfigContext } from './whats-next-types';

const TELEGRAM_REACT_PACKAGE = '@novu/react';
const TELEGRAM_DOCS_URL = 'https://docs.novu.co/platform/integrations/chat/telegram';
const APPLICATION_IDENTIFIER_PLACEHOLDER = '<YOUR_NOVU_APPLICATION_IDENTIFIER>';

function escapeJsxStringAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildTelegramConnectSnippet(integrationIdentifier: string, applicationIdentifier: string): string {
  const safeApplicationIdentifier = escapeJsxStringAttributeValue(applicationIdentifier);
  const safeIntegrationIdentifier = escapeJsxStringAttributeValue(integrationIdentifier);

  return `import { NovuProvider, TelegramConnectButton } from '${TELEGRAM_REACT_PACKAGE}';

// Wrap the button in a NovuProvider configured for the signed-in end user.
// Replace subscriberId with the current user's id (the connection is created per subscriber).
<NovuProvider
  applicationIdentifier="${safeApplicationIdentifier}"
  subscriberId="YOUR_SUBSCRIBER_ID"
>
  <TelegramConnectButton
    integrationIdentifier="${safeIntegrationIdentifier}"
    connectLabel="Connect Telegram \u2197"
    connectedLabel="Connected to Telegram"
  />
</NovuProvider>;`;
}

function buildTelegramPrompt(integrationIdentifier: string, agentName: string, applicationIdentifier: string): string {
  return `Add the Novu TelegramConnectButton from @novu/react to my app so each of my end users can connect "${agentName}" to their own Telegram chat.

Context: I'm already signed in to the Novu dashboard and the "${agentName}" Telegram integration already exists. This is purely a frontend code integration — do NOT run the Novu CLI, the agent-onboarding flow, or keyless mode.

Requirements:
- Install @novu/react with my project's package manager.
- Render <TelegramConnectButton /> inside a <NovuProvider> configured for the currently signed-in end user.
- Use applicationIdentifier="${applicationIdentifier}" and integrationIdentifier="${integrationIdentifier}". Store applicationIdentifier in an environment variable rather than hardcoding it.
- Each user gets their own connection, so pass the authenticated user's id as subscriberId — source it from my app's existing auth, don't hardcode it.
- Follow my app's existing framework, routing, styling, and TypeScript conventions, place the button in a sensible spot in the UI, and add no unnecessary wrappers.

Optional reference: ${TELEGRAM_DOCS_URL}`;
}

export function buildTelegramWhatsNextConfig({
  agent,
  integrationLink,
  applicationIdentifier,
}: WhatsNextConfigContext): ChannelWhatsNextConfig {
  const integrationIdentifier = integrationLink.integration.identifier;
  const novuApplicationIdentifier = applicationIdentifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const connectSnippet = buildTelegramConnectSnippet(integrationIdentifier, novuApplicationIdentifier);
  const prompt = buildTelegramPrompt(integrationIdentifier, agent.name, novuApplicationIdentifier);

  return {
    recapSteps: [
      {
        title: 'Create a bot with BotFather',
        description: 'You created a Telegram bot with BotFather and copied its HTTP API token.',
      },
      {
        title: 'Save the bot token to the integration',
        description: 'The bot token was saved to this integration and Novu registered the webhook with Telegram.',
      },
      {
        title: 'Send a test message',
        description:
          'You verified the connection by linking a chat and confirming the agent can reach you on Telegram.',
      },
    ],
    devSteps: [
      {
        sectionLabel: 'FOR YOUR USERS',
        title: (
          <span className="flex flex-wrap items-center gap-1.5">
            <span>Install</span>
            <code className="bg-bg-weak text-text-strong rounded px-1.5 py-0.5 font-code text-[12px]">
              {TELEGRAM_REACT_PACKAGE}
            </code>
          </span>
        ),
        description: `The NPM package ${TELEGRAM_REACT_PACKAGE} SDK to integrate Novu components in your application.`,
        headerSlot: <PrebuiltPromptBanner prompt={prompt} source="agent-channel-whats-next-telegram" />,
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={`npm install ${TELEGRAM_REACT_PACKAGE}`} language="shell" title="Terminal" />
          </div>
        ),
      },
      {
        title: 'Add Telegram connect button to your application',
        description:
          'TelegramConnectButton is a pre-built UI component in the @novu/react SDK that links a subscriber to your Telegram bot.',
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={connectSnippet} language="tsx" title="main.tsx" />
          </div>
        ),
      },
    ],
  };
}
