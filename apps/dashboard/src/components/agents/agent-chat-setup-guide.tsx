import type { AgentResponse } from '@/api/agents';
import { CodeBlock } from '@/components/primitives/code-block';
import { useEnvironment } from '@/context/environment/hooks';

const AGENT_CHAT_REACT_PACKAGE = '@novu/react';
const APPLICATION_IDENTIFIER_PLACEHOLDER = '<YOUR_NOVU_APPLICATION_IDENTIFIER>';

export type AgentChatSetupGuideProps = {
  agent: AgentResponse;
  /** Selected integration Mongo `_id` — kept for Setup Agent / Overview call-site parity. */
  integrationId: string;
  stepOffset?: number;
  onStepsCompleted?: () => void;
  embedded?: boolean;
  isOnboarding?: boolean;
  onWelcomeSent?: () => void;
};

function escapeJsxStringAttributeValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function buildAgentChatSnippet(agentIdentifier: string, applicationIdentifier: string): string {
  const safeApplicationIdentifier = escapeJsxStringAttributeValue(applicationIdentifier);
  const safeAgentIdentifier = escapeJsxStringAttributeValue(agentIdentifier);

  return `import { NovuProvider, useAgentChat } from '${AGENT_CHAT_REACT_PACKAGE}';

function AgentChat() {
  const { messages, sendMessage, respondToAction, isRunning, isLoading, error } = useAgentChat({
    agentId: "${safeAgentIdentifier}",
  });

  return (
    <>
      {error ? <p>{error.message}</p> : null}
      {/* Render messages, approvals (respondToAction), and a composer that calls sendMessage */}
      <pre>{JSON.stringify({ messages, isRunning, isLoading }, null, 2)}</pre>
    </>
  );
}

// Wrap the chat in a NovuProvider configured for the signed-in end user.
// Replace subscriberId with the current user's id.
export function App() {
  return (
    <NovuProvider
      applicationIdentifier="${safeApplicationIdentifier}"
      subscriberId="YOUR_SUBSCRIBER_ID"
    >
      <AgentChat />
    </NovuProvider>
  );
}`;
}

/**
 * Agent Chat needs no OAuth or credentials after Connect — teach the embed step only.
 * Overview (Setup Agent) and the Integrations detail guide both render this panel.
 */
export function AgentChatSetupGuide({ agent, embedded = false }: AgentChatSetupGuideProps) {
  const { currentEnvironment } = useEnvironment();
  const applicationIdentifier = currentEnvironment?.identifier || APPLICATION_IDENTIFIER_PLACEHOLDER;
  const snippet = buildAgentChatSnippet(agent.identifier, applicationIdentifier);

  const body = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <h3 className="text-text-strong text-label-sm font-medium leading-5">Embed Agent Chat in your app</h3>
        <p className="text-text-soft text-label-sm leading-5">
          The channel is ready. Install{' '}
          <code className="bg-bg-weak text-text-strong rounded px-1 py-0.5 font-code text-[12px]">
            {AGENT_CHAT_REACT_PACKAGE}
          </code>
          , wrap your UI in <code className="bg-bg-weak rounded px-1 py-0.5 font-code text-[12px]">NovuProvider</code>,
          and call <code className="bg-bg-weak rounded px-1 py-0.5 font-code text-[12px]">useAgentChat</code> with this
          agent&apos;s id.
        </p>
      </div>

      <CodeBlock code={snippet} language="tsx" title="useAgentChat.tsx" />

      <p className="text-text-soft text-label-xs leading-4">
        Optional: turn on Security HMAC encryption for this integration under{' '}
        <span className="text-text-sub font-medium">Integrations</span>, then pass the matching subscriber hash into{' '}
        <code className="bg-bg-weak rounded px-1 py-0.5 font-code text-[11px]">NovuProvider</code>.
      </p>
    </div>
  );

  if (embedded) {
    return <div className="flex flex-col gap-0 py-2">{body}</div>;
  }

  return <div className="flex flex-col gap-0 py-2 pr-3 md:pr-6">{body}</div>;
}
