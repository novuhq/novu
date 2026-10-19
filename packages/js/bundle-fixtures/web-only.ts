import { loadWebChat, Novu } from '../dist/esm/index.mjs';

async function main() {
  const novu = new Novu({ applicationIdentifier: 'app', subscriberId: 'sub' });
  await loadWebChat(novu);
  novu.webChat.conversation({ agentId: 'x' });
}

void main();
