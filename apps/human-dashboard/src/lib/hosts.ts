import { HOST_IDS, type HostId } from './host-ids';
import { AGENT_DOMAIN, INSTALL_SKILLS_COMMAND } from './onboarding';

export { HOST_IDS, type HostId, isHostId } from './host-ids';

/*
 * The hosts Agent Inbox has steps for: one list, which the dashboard's host picker ("Connect another agent"
 * and the onboarding's step 3) and the public page of each host (`/claude-code`, `/claude-code.md`) are
 * built from.
 *
 * A host that runs commands connects with the commands first, with the one-time code in them, and may have a
 * second way in under them: a plugin, or the MCP server in its own config. A chat app can't run commands, so
 * it only signs in to the hosted MCP server.
 *
 * The steps follow each host's own docs as of October 2026 (`docsUrl`). Hosts rename their settings often:
 * check a host's steps against its docs when someone says they don't match.
 */

/**
 * The hosted MCP server as agentinbox.md runs it (`apps/agent-inbox-mcp`). The dashboard asks `readMcpUrl()`,
 * which a deployment can point elsewhere; the public pages always name this one.
 */
export const MCP_URL = 'https://mcp.agentinbox.md';

/** What the MCP server is called in a host's own list of servers. */
export const MCP_SERVER_NAME = 'inbox';

export type HostGroup = 'commands' | 'chat';

/** The two groups, in the order the picker shows them, with the label above each. */
export const HOST_GROUPS: ReadonlyArray<{ group: HostGroup; label: string }> = [
  { group: 'commands', label: 'Runs commands' },
  { group: 'chat', label: 'Chat apps' },
];

/** One step a chat app's operator takes in the app, numbered. */
export type HostStep = {
  title: string;
  text: string;
  /** Something to copy under the step, such as the MCP server's address, made from the server's address. */
  copy?: { label: string; value: (mcpUrl: string) => string };
};

/** The second way a host that runs commands can get Agent Inbox, under its commands. */
export type HostAlternative = {
  /** "Or install the Claude Code plugin". */
  title: string;
  text: string;
  /** How the host then signs in to Agent Inbox. */
  signIn: string;
  /** A command that starts the sign-in, to copy, for a host that has one. */
  signInCommand?: string;
  /** More for an agent that reads the host's Markdown: how else to add it, how it updates. */
  agentNotes?: readonly string[];
} & (
  | {
      kind: 'plugin';
      /** Where `lines` are typed: in the host itself (Claude Code's prompt), or in a terminal. */
      typedIn: 'host' | 'terminal';
      lines: readonly string[];
    }
  | {
      kind: 'mcp-config';
      /** The file the config goes in, as people know it: `opencode.json`, `~/.cursor/mcp.json`. */
      file: string;
      config: (mcpUrl: string) => string;
      /** A link that adds the server in one click, for a host that has one (Cursor's "Add to Cursor"). */
      installLink?: { label: string; href: (mcpUrl: string) => string };
    }
);

type HostBase = {
  id: HostId;
  /** As people see it: "Claude Code", "Grok Bot". */
  name: string;
  /**
   * The logo on a rounded tile, from `public/tools`. `null` until the official one is added: the tile then
   * shows a neutral mark instead (`HostLogo`).
   */
  icon: string | null;
  /** The host's own docs for what its steps do, for agents (and people) that want to check. */
  docsUrl?: string;
};

export type CommandHost = HostBase & {
  group: 'commands';
  /**
   * Where its commands run: in the project a coding agent works in, or on the computer an always-on agent
   * (Hermes, OpenClaw) runs on.
   */
  runsIn: 'project' | 'computer';
  /** What the skills CLI calls this host (`npx skills add … --agent <id>`), when it installs for it alone. */
  skillsAgent?: string;
  /** What to do once the commands ran, for a host that needs it: Hermes loads new skills in a new session. */
  afterCommands?: string;
  alternative?: HostAlternative;
};

export type ChatApp = HostBase & {
  group: 'chat';
  steps: readonly HostStep[];
  /** The page in the app where its steps start, for the button that opens it. */
  settings?: { url: string; label: string };
  /** The app itself, to try it once it's connected. */
  appUrl?: string;
  /** Something to ask the app to see the inbox at work. */
  example: string;
  /**
   * The app adds the MCP server itself when asked to in a chat (Grok Bot), so an agent told to set up Agent
   * Inbox does that step instead of walking its operator through it.
   */
  addsServerWhenAsked?: true;
};

export type Host = CommandHost | ChatApp;

const EXAMPLE = 'What’s new in your inbox?';

/** What goes into `~/.cursor/mcp.json` by hand. */
export function cursorMcpConfig(mcpUrl: string): string {
  return ['{', '  "mcpServers": {', `    "${MCP_SERVER_NAME}": { "url": ${JSON.stringify(mcpUrl)} }`, '  }', '}'].join(
    '\n'
  );
}

/**
 * Cursor's own install link: it opens Cursor with the server filled in and one button to confirm. `config`
 * is the server alone, without its name, as Base64.
 */
export function cursorInstallLink(mcpUrl: string): string {
  const query = new URLSearchParams({ name: MCP_SERVER_NAME, config: btoa(JSON.stringify({ url: mcpUrl })) });

  return `cursor://anysphere.cursor-deeplink/mcp/install?${query}`;
}

/** What goes into `opencode.json`: the server as a remote one, which OpenCode signs in to with OAuth. */
export function opencodeMcpConfig(mcpUrl: string): string {
  return JSON.stringify(
    {
      $schema: 'https://opencode.ai/config.json',
      mcp: { [MCP_SERVER_NAME]: { type: 'remote', url: mcpUrl } },
    },
    null,
    2
  );
}

/** The MCP server's address, to paste into a chat app. */
const COPY_MCP_URL = { label: 'Copy the MCP server address', value: (mcpUrl: string) => mcpUrl };

/** The Claude Code plugin and the Codex plugin come from the same marketplace: the skills repository. */
const PLUGIN_TEXT = 'It brings the Agent Inbox skills and the MCP server, without the CLI.';

export const HOSTS: readonly Host[] = [
  {
    id: 'claude-code',
    name: 'Claude Code',
    group: 'commands',
    runsIn: 'project',
    // Claude's mark, which Claude Code shares, until the Claude Code logo is added.
    icon: '/tools/claude.png',
    skillsAgent: 'claude-code',
    docsUrl: 'https://code.claude.com/docs/en/discover-plugins',
    alternative: {
      kind: 'plugin',
      title: 'Or install the Claude Code plugin',
      text: PLUGIN_TEXT,
      typedIn: 'host',
      lines: ['/plugin marketplace add agentinboxhq/skills', '/plugin install agentinbox@agentinbox'],
      signIn: 'Then run /reload-plugins and /mcp in Claude Code, and sign in to Agent Inbox when the browser opens.',
      agentNotes: [
        'Without the plugin, `claude mcp add --transport http inbox https://mcp.agentinbox.md` adds the MCP server alone; `/mcp` signs in. Not both: every tool would show up twice.',
        'Claude Code updates the plugin with `claude plugin update agentinbox@agentinbox`.',
      ],
    },
  },
  {
    id: 'codex',
    name: 'Codex',
    group: 'commands',
    runsIn: 'project',
    icon: null,
    skillsAgent: 'codex',
    docsUrl: 'https://learn.chatgpt.com/docs/plugins',
    alternative: {
      kind: 'plugin',
      title: 'Or install the Codex plugin',
      text: `${PLUGIN_TEXT} Once the marketplace is added, /plugins in Codex installs it too.`,
      typedIn: 'terminal',
      lines: ['codex plugin marketplace add agentinboxhq/skills', 'codex plugin add agentinbox@agentinbox'],
      signIn: 'Then sign in to Agent Inbox in the browser:',
      signInCommand: `codex mcp login ${MCP_SERVER_NAME}`,
      agentNotes: [
        `Without the plugin, \`codex mcp add ${MCP_SERVER_NAME} --url ${MCP_URL}\` adds the MCP server alone; \`codex mcp login ${MCP_SERVER_NAME}\` signs in.`,
        'Plugin updates arrive when Codex starts, or right away with `codex plugin marketplace upgrade agentinbox`.',
      ],
    },
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    group: 'commands',
    runsIn: 'project',
    icon: null,
    skillsAgent: 'opencode',
    docsUrl: 'https://opencode.ai/docs/mcp-servers/',
    alternative: {
      kind: 'mcp-config',
      title: 'Or add the MCP server to OpenCode',
      text: 'Add this to opencode.json in your project, or to ~/.config/opencode/opencode.json for every project.',
      file: 'opencode.json',
      config: opencodeMcpConfig,
      signIn: 'Then sign in to Agent Inbox in the browser. opencode mcp list shows it signed in.',
      signInCommand: `opencode mcp auth ${MCP_SERVER_NAME}`,
    },
  },
  {
    id: 'cursor',
    name: 'Cursor',
    group: 'commands',
    runsIn: 'project',
    icon: '/tools/cursor.png',
    skillsAgent: 'cursor',
    docsUrl: 'https://cursor.com/docs/mcp',
    alternative: {
      kind: 'mcp-config',
      title: 'Or add the MCP server to Cursor',
      text: 'Add to Cursor does it in one click. Or add this to ~/.cursor/mcp.json.',
      file: '~/.cursor/mcp.json',
      config: cursorMcpConfig,
      installLink: { label: 'Add to Cursor', href: cursorInstallLink },
      signIn:
        'Then click Connect next to inbox in Cursor Settings › Tools & MCP. Approve the sign-in and Cursor gets its address.',
    },
  },
  {
    id: 'hermes',
    name: 'Hermes',
    group: 'commands',
    runsIn: 'computer',
    icon: null,
    // The skills CLI's name for Hermes Agent. Its skills go to ~/.hermes/skills (`-g`), where every session finds them.
    skillsAgent: 'hermes-agent',
    afterCommands: 'Then start a new Hermes session with /reset, so it loads the skills.',
    docsUrl: 'https://hermes-agent.nousresearch.com/docs/user-guide/features/skills',
  },
  {
    id: 'openclaw',
    name: 'OpenClaw',
    group: 'commands',
    runsIn: 'computer',
    icon: null,
    // Its skills go to ~/.openclaw/skills (`-g`), where its agents find them.
    skillsAgent: 'openclaw',
    docsUrl: 'https://docs.openclaw.ai/tools/skills',
  },
  { id: 'general', name: 'General', group: 'commands', runsIn: 'project', icon: null },
  {
    id: 'claude',
    name: 'Claude',
    group: 'chat',
    icon: '/tools/claude.png',
    settings: { url: 'https://claude.ai/settings/connectors', label: 'Open Claude settings' },
    appUrl: 'https://claude.ai',
    docsUrl: 'https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp',
    example: EXAMPLE,
    steps: [
      {
        title: 'Open your connectors',
        text: 'In Claude, open Customize › Connectors, choose Add and then Add custom connector.',
      },
      {
        title: 'Add a custom connector',
        text: 'Name it Inbox, paste this URL and choose Continue.',
        copy: COPY_MCP_URL,
      },
      {
        title: 'Sign in to Inbox',
        text: 'Choose Sign in now and Claude opens a sign-in window. Approve it and Claude gets its address.',
      },
    ],
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    group: 'chat',
    icon: '/tools/chatgpt.png',
    settings: { url: 'https://chatgpt.com/plugins', label: 'Open ChatGPT plugins' },
    appUrl: 'https://chatgpt.com',
    docsUrl: 'https://developers.openai.com/api/docs/guides/custom-mcp-server',
    example: EXAMPLE,
    steps: [
      {
        title: 'Add a custom MCP server',
        text: 'In ChatGPT, open Plugins, choose + and then Add custom MCP server.',
      },
      {
        title: 'Create the plugin',
        text: 'Name it Inbox, paste this URL, choose OAuth and create it as a plugin.',
        copy: COPY_MCP_URL,
      },
      {
        title: 'Sign in to Inbox',
        text: 'Install it and ChatGPT opens a sign-in window. Approve it and ChatGPT gets its address.',
      },
    ],
  },
  {
    id: 'grok',
    name: 'Grok Bot',
    group: 'chat',
    icon: null,
    docsUrl: 'https://cursor.com/help/grok-bot/connect-apps',
    example: EXAMPLE,
    addsServerWhenAsked: true,
    steps: [
      {
        title: 'Ask for the server',
        text: 'Grok Bot adds a custom MCP server when you ask it to in a chat. Send it this, and say Add it when it asks.',
        copy: {
          label: 'Copy the request',
          value: (mcpUrl) => `Add a custom MCP server called ${MCP_SERVER_NAME} at ${mcpUrl}`,
        },
      },
      {
        title: 'Sign in to Inbox',
        text: 'Click Authorize on the card it shows. Approve the sign-in and Grok Bot gets its address.',
      },
    ],
  },
];

const BY_ID = new Map<HostId, Host>(HOSTS.map((host) => [host.id, host]));

/** The host an id names. Every id has one: `hosts.spec.ts` checks the list against `HOST_IDS`. */
export function hostOf(id: HostId): Host {
  const host = BY_ID.get(id);
  if (!host) {
    throw new Error(`No host ${id}`);
  }

  return host;
}

/** The host the picker shows first. */
export const DEFAULT_HOST: HostId = HOST_IDS[0];

/** How the host is named in a sentence: "Claude Code", or "your agent" for General. */
export function hostSubject(host: Host): string {
  return host.id === 'general' ? 'your agent' : host.name;
}

/** The host's public page on this site, `/claude-code`, and its Markdown for agents, `/claude-code.md`. */
export function hostPath(id: HostId): string {
  return `/${id}`;
}

export function hostMarkdownPath(id: HostId): string {
  return `/${id}.md`;
}

/** What the operator tells their agent, which each host's page opens with: "Set up Agent Inbox from agentinbox.md/codex". */
export function tellYourAgent(id: HostId): string {
  return `Set up Agent Inbox from ${AGENT_DOMAIN}${hostPath(id)}`;
}

/** The line under the host's name on its page, and its description for search engines. */
export function hostSummary(host: Host): string {
  return `Give ${host.id === 'general' ? 'any agent that runs commands' : host.name} an inbox on Telegram, Slack and email, and a way to ask you and wait for your answer.`;
}

/**
 * Installs the skills for this host alone when the skills CLI knows it, or for the agents it finds in the
 * project otherwise. `-y` answers the CLI's questions (which skills, where, how): pasted with other
 * commands, a question would take the next line as its answer. An always-on agent gets them for every
 * session on the computer (`-g`), not for one folder.
 */
export function skillsCommand(host: CommandHost): string {
  const scope = host.runsIn === 'computer' ? ' -g' : '';

  return host.skillsAgent
    ? `${INSTALL_SKILLS_COMMAND}${scope} --agent ${host.skillsAgent} -y`
    : `${INSTALL_SKILLS_COMMAND}${scope} -y`;
}

/**
 * The hosts the hosted MCP server tells apart today, by the app that signed in (`toolOf` in
 * `apps/agent-inbox-mcp`): what the dashboard's `connectedTools` lists, and so the hosts the picker can tick.
 */
const SIGNED_IN_HOST_IDS = ['cursor', 'claude', 'chatgpt'] as const satisfies readonly HostId[];

export type ToolId = (typeof SIGNED_IN_HOST_IDS)[number];

const TOOL_IDS = new Set<string>(SIGNED_IN_HOST_IDS);

export function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && TOOL_IDS.has(value);
}
