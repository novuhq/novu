import { execFileSync } from 'node:child_process';

import { describe, expect, it } from 'vitest';

import {
  AGENT_IDS,
  agentHeading,
  agentPage,
  agentPagePairs,
  CHANNEL_IDS,
  channelHub,
  channelResources,
  codeLines,
  copyText,
  hasAgentPage,
  isChannelId,
  isShellCommand,
  otherAgentChannels,
  pageFaq,
  relatedAgents,
  setupPrompt,
} from './channel-pages';

describe('channel landing route contracts', () => {
  it('publishes 3 hubs and all 10 agents on every channel', () => {
    expect(CHANNEL_IDS).toEqual(['email', 'telegram', 'slack']);
    expect(AGENT_IDS).toEqual([
      'claude-code',
      'codex',
      'opencode',
      'cursor',
      'hermes',
      'openclaw',
      'claude',
      'chatgpt',
      'grok-bot',
      'any-agent',
    ]);
    expect(agentPagePairs()).toHaveLength(30);
  });
  it('keeps arbitrary path segments out', () => {
    expect(hasAgentPage('slack', '../settings')).toBe(false);
    expect(hasAgentPage('email', 'general')).toBe(false);
    expect(isChannelId('unknown')).toBe(false);
  });
  it('cross-links an agent to the other two channels and the other nine agents', () => {
    expect(otherAgentChannels('telegram', 'openclaw')).toEqual(['email', 'slack']);
    expect(relatedAgents('cursor')).toHaveLength(9);
    expect(relatedAgents('cursor')).not.toContain('cursor');
  });
  it('builds headings as the spec writes them', () => {
    expect(agentHeading('email', 'claude-code')).toEqual({ lead: 'Connect Claude Code', accent: 'to email' });
    expect(agentHeading('slack', 'any-agent')).toEqual({ lead: 'Connect any agent', accent: 'to Slack' });
  });
});

describe('page content', () => {
  it('fills every hub section', () => {
    for (const channel of CHANNEL_IDS) {
      const hub = channelHub(channel);
      expect(hub.features, channel).toHaveLength(4);
      expect(hub.steps, channel).toHaveLength(3);
      expect(
        hub.messages.map((item) => item.id),
        channel
      ).toEqual(['ask', 'approve', 'choose', 'tell']);
      expect(hub.reach, channel).toHaveLength(4);
      expect(hub.useCases, channel).toHaveLength(4);
      expect(hub.faq, channel).toHaveLength(5);
    }
  });
  it('fills every agent page section', () => {
    for (const { channel, agent } of agentPagePairs()) {
      const page = agentPage(channel, agent);
      const where = `/${channel}/${agent}`;
      expect(page.metaTitle, where).toMatch(/ \| Agent Inbox$/);
      expect(page.benefits, where).toHaveLength(3);
      expect(page.steps, where).toHaveLength(4);
      expect(page.prompts, where).toHaveLength(3);
      expect(page.faq, where).toHaveLength(3);
    }
  });
  it('uses no em dashes and none of the removed claims', () => {
    const text = JSON.stringify([
      CHANNEL_IDS.map(channelHub),
      agentPagePairs().map(({ channel, agent }) => agentPage(channel, agent)),
      CHANNEL_IDS.map(channelResources),
    ]);
    expect(text).not.toContain('—');
    expect(text).not.toContain('AgentMail');
    expect(text).not.toContain('Files both ways');
    expect(text).not.toContain('"status": "approved"');
  });
  it('renders FAQ text without the spec’s code backticks, first question open', () => {
    const faq = pageFaq('email', 'codex');
    expect(faq[0].defaultOpen).toBe(true);
    expect(faq[1].answer).toContain('Run codex mcp add AgentInbox --url https://mcp.agentinbox.md, then');
  });
});

describe('code blocks', () => {
  it('shows the $ prompt only where the spec does and copies without it', () => {
    const install = channelHub('email').steps[0].code!;
    expect(codeLines(install)).toEqual([{ prompt: true, text: 'npm i -g @agentinbox/cli' }]);
    expect(copyText(install)).toBe('npm i -g @agentinbox/cli');
    const plugin = agentPage('email', 'claude-code').steps[0].code!;
    expect(codeLines(plugin).every((line) => !line.prompt)).toBe(true);
    expect(copyText(plugin)).toBe('/plugin marketplace add agentinboxhq/skills\n/plugin install agentinbox@agentinbox');
  });
  it('uses each page’s own hero and CTA instead of the CLI default', () => {
    expect(agentPage('slack', 'codex').hero).toBe('codex plugin marketplace add agentinboxhq/skills');
    expect(agentPage('telegram', 'claude').cta).toBe('https://mcp.agentinbox.md');
    expect(isShellCommand(agentPage('telegram', 'claude').hero)).toBe(false);
    expect(isShellCommand(agentPage('email', 'openclaw').hero)).toBe(true);
  });
  it('steps without code have no copy text', () => {
    expect(agentPage('email', 'cursor').steps[0].code).toBeUndefined();
  });
});

/** Substitute printf for the CLI: exercise shell quoting without sending any messages. */
function shellArguments(command: string): string[] {
  expect(command).toMatch(/^agentinbox /);
  const shellCommand = command.replace(/ && .*$/, '').replace(/^agentinbox /, 'printf "%s\\n" ');
  return execFileSync('sh', ['-c', shellCommand], { encoding: 'utf8' }).trimEnd().split('\n');
}

describe('landing CLI instructions', () => {
  it('claims fresh CLI email setups before the first outbound example', () => {
    for (const page of [channelHub('email'), agentPage('email', 'openclaw'), agentPage('email', 'any-agent')]) {
      const commands = page.steps.flatMap((step) => (step.code ? copyText(step.code).split('\n') : []));
      const setup = commands.indexOf('agentinbox setup email');
      const login = commands.indexOf('agentinbox login');
      const send = commands.findIndex((command) => command.startsWith('agentinbox send '));
      expect(setup).toBeGreaterThanOrEqual(0);
      expect(login).toBeGreaterThan(setup);
      if (send !== -1) expect(login).toBeLessThan(send);
    }
  });

  it('finds verification mail from strangers and explains how to open its conversation', () => {
    const signup = channelHub('email').useCases.find((item) => item.label === 'Sign-ups');
    expect(signup?.command).toBe('agentinbox list --senders all');
    expect(signup?.description).toContain('agentinbox show <conversation-id>');
  });

  it('prepares fresh non-interactive setup instead of assuming terminal prompts', () => {
    for (const channel of CHANNEL_IDS) {
      const prompt = setupPrompt(channel, 'openclaw');
      expect(prompt).toContain('https://www.agentinbox.md/agents.md');
      expect(prompt).toContain('--email');
      expect(prompt).toContain('--agent-name');
      expect(prompt).toMatch(/ask me/i);
    }
    expect(setupPrompt('slack', 'any-agent')).toMatch(/^Set up Agent Inbox in Slack\./);
  });

  it('keeps every displayed agentinbox command safe to paste into a shell', () => {
    const commands = [
      ...CHANNEL_IDS.flatMap((channel) => {
        const hub = channelHub(channel);
        return [
          ...hub.messages.map((item) => item.command),
          ...hub.useCases.map((item) => item.command),
          ...hub.reach.flatMap((item) => (item.command ? [item.command] : [])),
          ...hub.steps.flatMap((step) => (step.code ? [copyText(step.code)] : [])),
        ];
      }),
      ...agentPagePairs().flatMap(({ channel, agent }) =>
        agentPage(channel, agent).steps.flatMap((step) => (step.code ? [copyText(step.code)] : []))
      ),
    ]
      .flatMap((command) => command.split('\n'))
      .filter((command) => command.startsWith('agentinbox '));
    for (const command of commands) expect(() => shellArguments(command), command).not.toThrow();
  });

  it('preserves dollar amounts and quoted options', () => {
    expect(shellArguments(channelHub('email').messages[1].command)).toEqual([
      'send',
      'approve',
      'Refund $240 to Acme Corp?',
      '--to',
      'maya',
      '--ttl',
      '2h',
    ]);
    expect(shellArguments(channelHub('email').messages[2].command)).toEqual([
      'send',
      'choose',
      'Which flight?',
      '--option',
      'am:9:00 AM',
      '--option',
      'pm:1:00 PM',
      '--to',
      'maya',
    ]);
    expect(shellArguments(channelHub('slack').messages[1].command)).toContain('Refund $25.00');
  });

  it('explains the required Telegram bot token in both setup and FAQ', () => {
    expect(channelHub('telegram').steps[1].description).toContain('BotFather');
    expect(channelHub('telegram').faq[0].answer).toContain('BotFather');
  });
});

describe('prompt card visuals', () => {
  it('draws one card per prompt on every agent page', async () => {
    const { promptVisuals } = await import('./channel-prompt-visuals');
    for (const { channel, agent } of agentPagePairs()) {
      expect(promptVisuals(channel, agent), `/${channel}/${agent}`).toHaveLength(
        agentPage(channel, agent).prompts.length
      );
    }
  });
});
