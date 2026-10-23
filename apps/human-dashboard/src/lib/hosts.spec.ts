import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { connectCommands } from './connect-prompt';
import { homeMarkdown, llmsIndex } from './home-markdown';
import { hostMarkdown } from './host-markdown';
import {
  type CommandHost,
  cursorInstallLink,
  HOST_IDS,
  HOSTS,
  hostOf,
  isToolId,
  MCP_URL,
  opencodeMcpConfig,
  skillsCommand,
  tellYourAgent,
} from './hosts';

const APP = join(__dirname, '..', 'app');
const PUBLIC = join(__dirname, '..', '..', 'public');

/** The first part of every address the site has, apart from the host pages: its routes and its public files. */
function takenSegments(folder: string): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    // A route group adds nothing to the address: what's in it sits at this level.
    if (entry.isDirectory() && entry.name.startsWith('(')) {
      return takenSegments(join(folder, entry.name));
    }

    return entry.name.startsWith('[') ? [] : [entry.name.replace(/\.(tsx?|png|svg|ico)$/, '')];
  });
}

describe('the host list', () => {
  it('has the ten hosts the other tickets agree on, in the picker’s order: commands first, then the chat apps', () => {
    expect(HOSTS.map(({ id, name, group }) => [id, name, group])).toEqual([
      ['claude-code', 'Claude Code', 'commands'],
      ['codex', 'Codex', 'commands'],
      ['opencode', 'OpenCode', 'commands'],
      ['cursor', 'Cursor', 'commands'],
      ['hermes', 'Hermes', 'commands'],
      ['openclaw', 'OpenClaw', 'commands'],
      ['general', 'General', 'commands'],
      ['claude', 'Claude', 'chat'],
      ['chatgpt', 'ChatGPT', 'chat'],
      ['grok', 'Grok Bot', 'chat'],
    ]);
    expect(HOSTS.map((host) => host.id)).toEqual([...HOST_IDS]);
    for (const id of HOST_IDS) {
      expect(hostOf(id).id).toBe(id);
    }
  });

  it('gives the plugin hosts a plugin, OpenCode and Cursor the MCP server, and Hermes, OpenClaw and General nothing more', () => {
    const second = Object.fromEntries(
      HOSTS.filter((host): host is CommandHost => host.group === 'commands').map((host) => [
        host.id,
        host.alternative?.kind ?? null,
      ])
    );

    expect(second).toEqual({
      'claude-code': 'plugin',
      codex: 'plugin',
      opencode: 'mcp-config',
      cursor: 'mcp-config',
      hermes: null,
      openclaw: null,
      general: null,
    });
  });

  it('never takes an address the site already has', () => {
    const taken = new Set([...takenSegments(APP), ...readdirSync(PUBLIC)]);

    expect(HOST_IDS.filter((id) => taken.has(id) || taken.has(`${id}.md`))).toEqual([]);
  });

  it('ticks only the hosts the MCP server tells apart today', () => {
    expect(HOST_IDS.filter(isToolId)).toEqual(['cursor', 'claude', 'chatgpt']);
  });
});

describe('the steps', () => {
  it('installs the skills for the host alone, without questions, and for every agent found on General', () => {
    expect(skillsCommand(hostOf('claude-code') as CommandHost)).toBe(
      'npx skills add agentinboxhq/skills --agent claude-code -y'
    );
    expect(skillsCommand(hostOf('hermes') as CommandHost)).toBe(
      'npx skills add agentinboxhq/skills -g --agent hermes-agent -y'
    );
    expect(skillsCommand(hostOf('openclaw') as CommandHost)).toBe(
      'npx skills add agentinboxhq/skills -g --agent openclaw -y'
    );
    expect(skillsCommand(hostOf('general') as CommandHost)).toBe('npx skills add agentinboxhq/skills -y');
  });

  it('puts the code and the API in `connect`, and the host’s skills after it', () => {
    const commands = connectCommands(
      { handle: 'atlas', code: 'BCDF-GHJK', apiUrl: 'https://www.agentinbox.md/api' },
      hostOf('codex') as CommandHost
    ).map(({ command }) => command);

    expect(commands).toEqual([
      'npx @agentinbox/cli connect atlas --code BCDF-GHJK --yes --api-url=https://www.agentinbox.md/api',
      'npx skills add agentinboxhq/skills --agent codex -y',
      'npx @agentinbox/cli inbox list',
    ]);
  });

  it('leaves the API out where there is none, as on a public page', () => {
    expect(connectCommands({ handle: '<agent>', code: '<code>' })[0].command).toBe(
      'npx @agentinbox/cli connect <agent> --code <code> --yes'
    );
  });

  it('opens Cursor with the server and nothing else in its config', () => {
    const link = new URL(cursorInstallLink(MCP_URL));
    const config = link.searchParams.get('config') ?? '';

    expect(link.protocol).toBe('cursor:');
    expect(link.searchParams.get('name')).toBe('inbox');
    expect(JSON.parse(atob(config))).toEqual({ url: 'https://mcp.agentinbox.md' });
  });

  it('adds the server to OpenCode as a remote one', () => {
    expect(JSON.parse(opencodeMcpConfig(MCP_URL))).toEqual({
      $schema: 'https://opencode.ai/config.json',
      mcp: { inbox: { type: 'remote', url: 'https://mcp.agentinbox.md' } },
    });
  });
});

describe('the Markdown for agents', () => {
  it('opens every host’s page with what the operator tells their agent', () => {
    for (const host of HOSTS) {
      const [title, line] = hostMarkdown(host).split('\n\n');

      expect(title).toMatch(/^# Agent Inbox for /);
      expect(line).toBe(`> ${tellYourAgent(host.id)}`);
      expect(line).toBe(`> Set up Agent Inbox from agentinbox.md/${host.id}`);
    }
  });

  it('gives a host that runs commands the code, the self-setup and its second way in', () => {
    const markdown = hostMarkdown(hostOf('claude-code'));

    expect(markdown).toContain('`npx @agentinbox/cli connect <agent> --code <code> --yes`');
    expect(markdown).toContain('npx skills add agentinboxhq/skills --agent claude-code -y');
    expect(markdown).toContain('npx @agentinbox/cli setup --email <their email> --name "<their name>"');
    expect(markdown).toContain('`npx @agentinbox/cli login`');
    expect(markdown).toContain('/plugin install agentinbox@agentinbox');
    expect(markdown).toContain('Never ask for a Telegram bot token or a Slack token');
    expect(hostMarkdown(hostOf('cursor'))).toContain(cursorInstallLink(MCP_URL));
    expect(hostMarkdown(hostOf('opencode'))).toContain('`opencode mcp auth inbox`');
    expect(hostMarkdown(hostOf('codex'))).toContain('codex plugin add agentinbox@agentinbox');
    expect(hostMarkdown(hostOf('codex'))).toContain('`codex mcp login inbox`');
    expect(hostMarkdown(hostOf('hermes'))).toContain('/reset');
  });

  it('tells an agent on General to name itself to the skills CLI, which installs nothing otherwise', () => {
    const markdown = hostMarkdown(hostOf('general'));

    expect(markdown).toContain('`npx skills add agentinboxhq/skills --agent <your id> -y`');
    expect(markdown).not.toMatch(/`npx skills add agentinboxhq\/skills -y`/);
  });

  it('gives a chat app its sign-in, and no commands to run', () => {
    for (const id of ['claude', 'chatgpt', 'grok'] as const) {
      const markdown = hostMarkdown(hostOf(id));

      expect(markdown).toContain(MCP_URL);
      expect(markdown).toContain('inbox_setup');
      expect(markdown).not.toContain('npx @agentinbox/cli connect');
    }
    expect(hostMarkdown(hostOf('grok'))).toContain('Add a custom MCP server called inbox at https://mcp.agentinbox.md');
  });

  it('links every host’s page from /llms.txt and /index.md', () => {
    const llms = llmsIndex();
    const index = homeMarkdown();

    for (const id of HOST_IDS) {
      expect(llms).toContain(`(https://www.agentinbox.md/${id}.md)`);
      expect(index).toContain(`(https://www.agentinbox.md/${id}.md)`);
    }
    expect(index).toContain('Your agent may run setup and login for you when you ask it to');
    expect(llms).toContain('An agent may run setup and login when its operator asks it to');
  });
});
