import { describe, expect, it } from 'vitest';
import { buildChannelPrompt } from './agent-setup-prompt';

const CONTEXT = { apiUrl: 'https://www.agentinbox.md/api' };

describe('buildChannelPrompt', () => {
  it.each([
    ['telegram', 'a bot token'],
    ['slack', 'a Slack token'],
  ] as const)('has the agent hand over the %s link and never take %s', (via, token) => {
    const prompt = buildChannelPrompt(CONTEXT, via, 'atlas');

    expect(prompt).toContain(`npx @agentinbox/cli channel add ${via} and give me the link it prints.`);
    expect(prompt).toContain('have the channel_add tool, call it and give me the link it returns.');
    expect(prompt).toContain(`never ask me for ${token}.`);
    expect(prompt).not.toMatch(/paste/i);
  });

  it('gives WhatsApp the design’s words and leaves the steps to setup.md', () => {
    expect(buildChannelPrompt(CONTEXT, 'whatsapp', 'atlas')).toBe(
      'Turn on WhatsApp Business for atlas. Read agentinbox.md/setup.md, then run inbox channel add whatsapp. Send me the Meta link to connect my business account and number. Done when a message I send on WhatsApp shows up in atlas’s inbox.'
    );
  });

  it('sends a local site’s agent to that site’s own setup.md', () => {
    const prompt = buildChannelPrompt({ apiUrl: 'http://localhost:4300/api' }, 'whatsapp', 'atlas');

    expect(prompt).toContain('Read http://localhost:4300/setup.md, then run inbox channel add whatsapp.');
  });

  it('names the API when it is not the one the CLI goes to by itself', () => {
    const prompt = buildChannelPrompt({ apiUrl: 'https://staging.agentinbox.md/api' }, 'telegram', 'atlas');

    expect(prompt).toContain('channel add telegram --api-url=https://staging.agentinbox.md/api and give me the link');
  });
});
