import { describe, expect, it } from 'vitest';
import {
  buildConnectEmbedPrompt,
  CONNECT_EMBED_TEMPLATE_LOCAL_PATH,
  CONNECT_EMBED_TEMPLATE_URL,
} from './connect-embed-prompt';

describe('buildConnectEmbedPrompt', () => {
  const prompt = buildConnectEmbedPrompt({
    agentName: 'Support',
    agentIdentifier: 'support-agent',
    applicationIdentifier: 'app-id',
    subscriberId: 'sub-1',
    connectMode: 'demo',
  });

  it('points embed agents at the connect template, not dashboard chat', () => {
    expect(prompt).toContain(CONNECT_EMBED_TEMPLATE_URL);
    expect(prompt).toContain(CONNECT_EMBED_TEMPLATE_LOCAL_PATH);
    expect(prompt).not.toContain('apps/dashboard/src/components/agents/web-chat-panel');
  });

  it('lists the must-render capabilities and host-app styling rule', () => {
    expect(prompt).toContain('Must render');
    expect(prompt).toContain('Approvals + MCP authorize **in the thread**');
    expect(prompt).toContain('Thinking indicator');
    expect(prompt).toContain("Match this app's design system");
    expect(prompt).toContain('Do not paste scaffold, playground, or dashboard colors');
  });
});
