import { Inbox, NovuProvider, useWebChat } from '../dist/esm/index.js';

function WebChatPanel() {
  const chat = useWebChat({ agentId: 'agent-1' });

  return <div>{chat.isLoading ? 'loading' : chat.messages.length}</div>;
}

export function CombinedApp() {
  return (
    <NovuProvider applicationIdentifier="app" subscriberId="sub">
      <Inbox />
      <WebChatPanel />
    </NovuProvider>
  );
}
