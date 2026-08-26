import { Inbox, NovuProvider, useAgentChat } from '../dist/esm/index.js';

function AgentChatPanel() {
  const chat = useAgentChat({ agentId: 'agent-1' });

  return <div>{chat.isLoading ? 'loading' : chat.messages.length}</div>;
}

export function CombinedApp() {
  return (
    <NovuProvider applicationIdentifier="app" subscriberId="sub">
      <Inbox />
      <AgentChatPanel />
    </NovuProvider>
  );
}
