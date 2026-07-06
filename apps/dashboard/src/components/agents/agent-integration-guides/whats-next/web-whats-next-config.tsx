import { PrebuiltPromptBanner } from '@/components/onboarding/connect-agent/prebuilt-prompt-banner';
import { CodeBlock } from '@/components/primitives/code-block';
import type { ChannelWhatsNextConfig, WhatsNextConfigContext } from './whats-next-types';

const WEB_REACT_PACKAGE = '@novu/react';
const WEB_DOCS_URL = 'https://docs.novu.co/agents/channels/web';
const APPLICATION_IDENTIFIER_PLACEHOLDER = '<YOUR_NOVU_APPLICATION_IDENTIFIER>';

function escapeJsxStringAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildWebChatSnippet(agentIdentifier: string, applicationIdentifier: string): string {
  const safeApplicationIdentifier = escapeJsxStringAttributeValue(applicationIdentifier);
  const safeAgentIdentifier = escapeJsxStringAttributeValue(agentIdentifier);

  return `import { ConversationMessageContent, NovuProvider, useConversation } from '${WEB_REACT_PACKAGE}';

function AgentChat() {
  const { messages, sendMessage, sendAction, isTyping } = useConversation({
    agent: "${safeAgentIdentifier}",
  });

  return (
    <div>
      {messages.map((message) => (
        <div key={message.id} data-role={message.role}>
          {/* Fully headless: render message.parts yourself, or use the built-in
              unstyled renderer (cards, files, and approvals included). */}
          <ConversationMessageContent message={message} onAction={sendAction} />
        </div>
      ))}
      {isTyping && <span>Agent is typing…</span>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem('text') as HTMLInputElement;
          sendMessage(input.value);
          input.value = '';
        }}
      >
        <input name="text" placeholder="Ask the agent anything" />
      </form>
    </div>
  );
}

// Wrap with a NovuProvider configured for the signed-in end user.
// Replace subscriberId with the current user's id — the conversation belongs to them.
<NovuProvider
  applicationIdentifier="${safeApplicationIdentifier}"
  subscriberId="YOUR_SUBSCRIBER_ID"
>
  <AgentChat />
</NovuProvider>;`;
}

function buildWebPrompt(agentIdentifier: string, agentName: string, applicationIdentifier: string): string {
  return `Add an in-app chat UI for my Novu agent "${agentName}" using the headless hooks from @novu/react, so my signed-in users can chat with the agent directly inside my app.

Context: I'm already signed in to the Novu dashboard and the "${agentName}" Web Chat integration already exists. This is purely a frontend code integration — do NOT run the Novu CLI, the agent-onboarding flow, or keyless mode.

Requirements:
- Install @novu/react with my project's package manager.
- Build the chat view with the useConversation({ agent: "${agentIdentifier}" }) hook inside a <NovuProvider> configured for the currently signed-in end user.
- Use applicationIdentifier="${applicationIdentifier}". Store it in an environment variable rather than hardcoding it.
- Each user chats as themselves, so pass the authenticated user's id as subscriberId — source it from my app's existing auth, don't hardcode it.
- Render messages from the hook's \`messages\` array (each message has typed \`parts\`: text/card/file/toolApproval). Use <ConversationMessageContent message={m} onAction={sendAction} /> for rich cards unless I have my own design system components.
- Show the \`isTyping\` indicator while the agent works, and use \`useConversations\` if I want a thread list with resume/new-conversation.
- Follow my app's existing framework, routing, styling, and TypeScript conventions, and add no unnecessary wrappers.

Optional reference: ${WEB_DOCS_URL}`;
}

export function buildWebWhatsNextConfig({
  agent,
  applicationIdentifier,
}: WhatsNextConfigContext): ChannelWhatsNextConfig {
  const novuApplicationIdentifier = applicationIdentifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const chatSnippet = buildWebChatSnippet(agent.identifier, novuApplicationIdentifier);
  const prompt = buildWebPrompt(agent.identifier, agent.name, novuApplicationIdentifier);

  return {
    recapSteps: [
      {
        title: 'Create the Web Chat integration',
        description:
          'The web channel was added to this agent — no credentials needed. Your app talks to Novu directly with the same subscriber session the Inbox uses.',
      },
    ],
    devSteps: [
      {
        sectionLabel: 'FOR YOUR USERS',
        title: (
          <span className="flex flex-wrap items-center gap-1.5">
            <span>Install</span>
            <code className="bg-bg-weak text-text-strong rounded px-1.5 py-0.5 font-code text-[12px]">
              {WEB_REACT_PACKAGE}
            </code>
          </span>
        ),
        description: `The NPM package ${WEB_REACT_PACKAGE} ships headless conversation hooks (useConversation, useConversations) and an unstyled card renderer for building your own chat UI.`,
        headerSlot: <PrebuiltPromptBanner prompt={prompt} source="agent-channel-whats-next-web" />,
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={`npm install ${WEB_REACT_PACKAGE}`} language="shell" title="Terminal" />
          </div>
        ),
      },
      {
        title: 'Build your chat UI with useConversation',
        description:
          'The hook manages history, live agent replies (streamed while a send is in flight), typing state, and card actions — you own every pixel of the UI. Send a message from your app to mark the channel connected.',
        fullWidthContent: (
          <div className="pt-3">
            <CodeBlock code={chatSnippet} language="tsx" title="agent-chat.tsx" />
          </div>
        ),
      },
    ],
  };
}
