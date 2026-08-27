import { loadAgentChat, Novu } from '../dist/esm/index.mjs';

async function main() {
  const novu = new Novu({ applicationIdentifier: 'app', subscriberId: 'sub' });
  void novu.notifications.list({ limit: 10 });
  await loadAgentChat(novu);
  novu.agentChat.conversation({ agentId: 'x' });
}

void main();
