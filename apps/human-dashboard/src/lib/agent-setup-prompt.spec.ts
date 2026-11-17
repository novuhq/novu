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

  it('names the API when it is not the one the CLI goes to by itself', () => {
    const prompt = buildChannelPrompt({ apiUrl: 'https://staging.agentinbox.md/api' }, 'telegram', 'atlas');

    expect(prompt).toContain('channel add telegram --api-url=https://staging.agentinbox.md/api and give me the link');
  });
});
