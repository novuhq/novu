import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import {
  agentPagePairs,
  CHANNEL_IDS,
  channelFaq,
  hasAgentPage,
  isChannelId,
  MESSAGE_EXAMPLES,
  otherAgentChannels,
  setupPrompt,
  setupSteps,
  USE_CASES,
} from './channel-pages';

describe('channel landing route contracts', () => {
  it('publishes exactly the three channels and eight agent pairs in the brief', () => {
    expect(CHANNEL_IDS).toEqual(['email', 'telegram', 'slack']);
    expect(agentPagePairs().map(({ channel, agent }) => `/${channel}/${agent}`)).toEqual([
      '/email/openclaw',
      '/telegram/openclaw',
      '/telegram/claude-code',
      '/telegram/hermes',
      '/slack/claude-code',
      '/slack/openclaw',
      '/slack/codex',
      '/slack/cursor',
    ]);
  });
  it('keeps unrequested pairs and arbitrary path segments out', () => {
    expect(hasAgentPage('email', 'codex')).toBe(false);
    expect(hasAgentPage('telegram', 'cursor')).toBe(false);
    expect(hasAgentPage('slack', '../settings')).toBe(false);
    expect(isChannelId('unknown')).toBe(false);
  });
  it('cross-links an agent only to published channels', () => {
    expect(otherAgentChannels('telegram', 'openclaw')).toEqual(['email', 'slack']);
    expect(otherAgentChannels('telegram', 'hermes')).toEqual([]);
  });
  it('keeps channel and agent setup instructions distinct', () => {
    expect(setupSteps('telegram')).toHaveLength(3);
    expect(setupSteps('telegram', 'openclaw')).toHaveLength(4);
    expect(setupSteps('slack', 'codex')[2].command).toContain('--agent codex');
    expect(setupSteps('telegram', 'hermes')[2].command).toContain('-g --agent hermes-agent');
    expect(setupSteps('email', 'openclaw')[2].command).toContain('-g --agent openclaw');
  });
});

/** Substitute printf for the CLI: exercise shell quoting without sending any messages. */
function shellArguments(command: string): string[] {
  expect(command).toMatch(/^agentinbox /);
  return execFileSync('sh', ['-c', command.replace(/^agentinbox /, 'printf "%s\\n" ')], { encoding: 'utf8' })
    .trimEnd()
    .split('\n');
}

describe('landing CLI instructions', () => {
  it('prepares fresh non-interactive setup instead of assuming terminal prompts', () => {
    for (const channel of CHANNEL_IDS) {
      const prompt = setupPrompt(channel, 'openclaw');
      expect(prompt).toContain('https://www.agentinbox.md/agents.md');
      expect(prompt).toContain('--email');
      expect(prompt).toContain('--agent-name');
      expect(prompt).toMatch(/ask me/i);
    }
  });

  it('sends the test message through the channel being connected, with no tell prefix', () => {
    for (const channel of CHANNEL_IDS) {
      expect(shellArguments(setupSteps(channel).at(-1)!.command)).toEqual([
        'send',
        'Hello from your agent',
        '--via',
        channel,
      ]);
    }
  });

  it('preserves the refund amount when a use-case example is pasted into a shell', () => {
    expect(shellArguments(USE_CASES[0].command)).toEqual(['send', 'approve', 'Refund $240?', '--to', 'maya']);
  });

  it('keeps the displayed message examples safe to paste into a shell', () => {
    const example = (id: string) => MESSAGE_EXAMPLES.find((item) => item.id === id)!.command;
    expect(shellArguments(example('approve'))).toEqual([
      'send',
      'approve',
      'Refund $240 to Acme Corp?',
      '--to',
      'maya',
      '--ttl',
      '2h',
    ]);
    expect(shellArguments(example('choose'))).toEqual([
      'send',
      'choose',
      'Which table?',
      '--option',
      'slot1:19:00',
      '--option',
      'slot2:19:30',
      '--option',
      'slot3:20:15',
    ]);
    expect(shellArguments(example('tell'))).toEqual(['send', 'Nightly scrape done: 1,240 pages, 0 errors.']);
    expect(JSON.parse(MESSAGE_EXAMPLES.find((item) => item.id === 'choose')!.output).choice).toBe('slot2');
  });

  it('explains the required Telegram bot token in both setup and FAQ', () => {
    expect(setupSteps('telegram')[1].description).toContain('BotFather');
    expect(channelFaq('telegram')[0].answer).toContain('BotFather');
  });
});
