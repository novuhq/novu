import { describe, expect, it } from 'vitest';
import { setupMarkdown } from './setup-md';

describe('setupMarkdown', () => {
  it('says what `inbox` is and how to connect each channel without taking a token', () => {
    const markdown = setupMarkdown('https://www.agentinbox.md/api');

    expect(markdown).toContain('`inbox channel add whatsapp` is `npx @agentinbox/cli channel add whatsapp`');
    expect(markdown).toContain('npx @agentinbox/cli login');
    expect(markdown).toContain('never ask for a bot token, a Slack token or Meta (WhatsApp) keys');
    expect(markdown).toContain('call `channel_add` with the channel');
    expect(markdown).toContain('npx @agentinbox/cli list --filter unread');
    expect(markdown).not.toContain('--api-url');
  });

  it('names a local or staging API in every command', () => {
    const markdown = setupMarkdown('http://localhost:4300/api');

    expect(markdown).toContain('channel add whatsapp --api-url=http://localhost:4300/api');
    expect(markdown).toContain('login --api-url=http://localhost:4300/api');
    expect(markdown).toContain('list --filter unread --api-url=http://localhost:4300/api');
  });
});
