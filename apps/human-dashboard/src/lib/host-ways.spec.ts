import { describe, expect, it } from 'vitest';

import {
  chatPrompt,
  cliCaption,
  cliScript,
  connectorSteps,
  copiesAlone,
  mcpCaption,
  mcpScript,
  pluginScript,
  promptText,
  wayLabel,
  waysOf,
} from './host-ways';
import { type ChatApp, type CommandHost, HOST_IDS, HOSTS, hostOf, MCP_URL, PICKER_RUNS } from './hosts';

const DETAILS = { handle: 'atlas', code: 'BCDF-GHJK', apiUrl: 'https://www.agentinbox.md/api' };

const commandHost = (id: string) => hostOf(id as never) as CommandHost;
const chatApp = (id: string) => hostOf(id as never) as ChatApp;

describe('the picker', () => {
  it('shows every host once, in runs: the chat apps, the coding agents, then the agents on their own computer', () => {
    expect(PICKER_RUNS).toEqual([
      ['chatgpt', 'claude', 'grok'],
      ['claude-code', 'cursor', 'codex', 'opencode'],
      ['hermes', 'openclaw', 'general'],
    ]);
    expect([...PICKER_RUNS.flat()].sort()).toEqual([...HOST_IDS].sort());
  });
});

describe('the ways in', () => {
  it('opens a coding agent on its plugin or MCP config, any other host on its commands, a chat app on the server', () => {
    expect(Object.fromEntries(HOSTS.map((host) => [host.id, waysOf(host)]))).toEqual({
      'claude-code': ['plugin', 'cli'],
      codex: ['plugin', 'cli'],
      opencode: ['mcp', 'cli'],
      cursor: ['mcp', 'cli'],
      hermes: ['cli', 'mcp'],
      openclaw: ['cli'],
      general: ['cli'],
      claude: ['connector', 'prompt'],
      chatgpt: ['connector', 'prompt'],
      grok: ['prompt'],
    });
  });

  it('names each tab as its host does', () => {
    expect(wayLabel(chatApp('claude'), 'connector')).toBe('Connector');
    expect(wayLabel(chatApp('chatgpt'), 'connector')).toBe('Plugin');
    expect(wayLabel(commandHost('hermes'), 'cli')).toBe('CLI');
    expect(wayLabel(chatApp('grok'), 'prompt')).toBe('Prompt');
  });
});

describe('the commands', () => {
  it('puts each command under a note on what it does, and copies the commands alone', () => {
    const script = cliScript(commandHost('claude-code'), DETAILS);

    expect(script.lines.filter((line) => line.kind === 'note').map((line) => line.text)).toEqual([
      '1. Connect this machine to atlas',
      '2. Teach Claude Code how to use the inbox',
      '3. Check it works',
    ]);
    expect(script.copy).toBe(
      [
        'npx @agentinbox/cli connect atlas --code BCDF-GHJK --yes --api-url=https://www.agentinbox.md/api',
        'npx skills add agentinboxhq/skills --agent claude-code -y',
        'npx @agentinbox/cli list',
      ].join('\n')
    );
    expect(script.lines.some((line) => copiesAlone(script, line))).toBe(false);
  });

  it('says where they run, and what Hermes needs after them', () => {
    expect(cliCaption(commandHost('claude-code'))).toBe(
      'Run it where Claude Code works. The code works once and expires in 10 min.'
    );
    expect(cliCaption(commandHost('hermes'))).toBe(
      'Run it on the computer Hermes runs on. The code works once and expires in 10 min.'
    );
    expect(cliCaption(commandHost('general'))).toMatch(/^Run it where your agent works\./);
    expect(cliScript(commandHost('hermes'), DETAILS).lines.at(-1)).toEqual({
      kind: 'note',
      text: '4. Start a new Hermes session with /reset, so it loads the skills',
    });
  });
});

describe('the plugins', () => {
  it('installs the Claude Code plugin from a terminal, so the button copies both commands at once', () => {
    const script = pluginScript(commandHost('claude-code'));

    expect(script.copy).toBe(
      'claude plugin marketplace add agentinboxhq/skills\nclaude plugin install agentinbox@agentinbox'
    );
    expect(script.lines.at(-1)).toEqual({
      kind: 'note',
      text: '2. Run /reload-plugins and /mcp in Claude Code, and sign in to Agent Inbox when the browser opens',
    });
  });

  it('signs Codex in with its own command, which the button copies too, then has it start a session', () => {
    const script = pluginScript(commandHost('codex'));

    expect(script.copy.split('\n')).toEqual([
      'codex plugin marketplace add agentinboxhq/skills',
      'codex plugin add agentinbox@agentinbox',
      'codex mcp login AgentInbox',
    ]);
    // Codex connects only when a session starts: until then the page has nothing to show.
    expect(script.lines.at(-1)).toEqual({
      kind: 'note',
      text: '3. Start Codex: it connects to Agent Inbox when a session starts',
    });
  });
});

describe('the MCP server in a host’s config', () => {
  it('gives Cursor its one-click link as the button, and the config a copy button of its own', () => {
    const script = mcpScript(commandHost('cursor'), MCP_URL);
    const snippet = script.lines.find((line) => line.kind === 'snippet');

    expect(script.copy).toBe('');
    expect(snippet && copiesAlone(script, snippet)).toBe(true);
  });

  it('adds OpenCode’s server with a command, which the button copies with the sign-in command', () => {
    const script = mcpScript(commandHost('opencode'), MCP_URL);

    // A copied config saves nowhere: the command writes it.
    expect(script.copy.split('\n')).toEqual([
      `opencode mcp add AgentInbox --url ${MCP_URL}`,
      'opencode mcp auth AgentInbox',
    ]);
    expect(script.lines.filter((line) => line.kind === 'command')).toEqual([
      { kind: 'command', text: `opencode mcp add AgentInbox --url ${MCP_URL}`, prompt: '$' },
      { kind: 'command', text: 'opencode mcp auth AgentInbox', prompt: '$' },
    ]);
    expect(script.lines.some((line) => copiesAlone(script, line))).toBe(false);
    expect(script.lines.filter((line) => line.kind === 'note')).toEqual([
      { kind: 'note', text: '1. Run this in your project, or add --global to add it for every project:' },
      { kind: 'note', text: '2. Sign in to Agent Inbox in the browser' },
    ]);
  });

  it('adds Hermes’s server with one command that also signs in, so the button copies that alone', () => {
    const script = mcpScript(commandHost('hermes'), MCP_URL);

    // `hermes mcp add` asks as it goes: a line pasted after it would be taken as an answer.
    expect(script.copy).toBe(`hermes mcp add AgentInbox --url ${MCP_URL} --auth oauth`);
    expect(script.lines.filter((line) => line.kind === 'note').map((line) => line.text)).toEqual([
      '1. Run this on the computer Hermes runs on:',
      '2. Sign in to Agent Inbox in the browser, and say yes when Hermes asks to enable the tools',
      '3. Start a new Hermes session, or run /reload-mcp in an open one',
    ]);
    expect(script.lines.some((line) => copiesAlone(script, line))).toBe(false);
    expect(mcpCaption(commandHost('hermes'))).toBe(
      'Run it in a terminal. No code needed: Hermes signs in to Agent Inbox in the browser.'
    );
    expect(mcpCaption(commandHost('opencode'))).toMatch(/^Run them in a terminal\. /);
  });
});

describe('the chat apps', () => {
  it('lists the app’s own steps, with the server’s address after the one that pastes it', () => {
    expect(connectorSteps(chatApp('chatgpt'), MCP_URL)).toEqual([
      { text: 'In ChatGPT, open Plugins, choose + and then Add custom MCP server.', paste: undefined },
      { text: 'Name it AgentInbox, paste this URL, choose OAuth and create it as a plugin.', paste: MCP_URL },
      {
        text: 'Install it and ChatGPT opens a sign-in window. Approve it and ChatGPT gets its address.',
        paste: undefined,
      },
    ]);
  });

  it('hands the app a prompt with the agent, its instructions and the rule it keeps, and no code', () => {
    const prompt = promptText(
      chatPrompt(chatApp('claude'), { handle: 'atlas', address: 'atlas@agentinbox.md', mcpUrl: MCP_URL })
    );

    expect(prompt).toBe(
      [
        'Connect to my agentinbox.md inbox as atlas (atlas@agentinbox.md).',
        'Instructions: https://agentinbox.md/agents.md',
        '',
        'From now on, check the inbox at the start of every task.',
        'Ask me before you message anyone new.',
      ].join('\n')
    );
  });

  it('asks Grok Bot for the server first, which it adds itself', () => {
    const prompt = promptText(chatPrompt(chatApp('grok'), { handle: 'atlas', mcpUrl: MCP_URL }));

    expect(prompt.split('\n').slice(0, 3)).toEqual([
      'Add a custom MCP server called AgentInbox at https://mcp.agentinbox.md',
      '',
      'Connect to my agentinbox.md inbox as atlas.',
    ]);
  });
});
