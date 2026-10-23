import type { SectionAssets } from '@/data/sapien-assets';

export const integrationsAssets = {
  imgControls: {
    src: '/images/sapien/integrations/imgControls.svg',
    width: 36,
    height: 8,
    nodeId: '724:4486',
    purpose: 'Terminal window controls (three dots)',
  },
} satisfies SectionAssets;

export const INTEGRATIONS_HEADING = {
  lead: 'Works',
  accent: 'everywhere',
  rest: 'your agents are',
} as const;

export const INTEGRATIONS_LIST_LABEL = 'Integrations';

export type IntegrationSnippet =
  /**
   * Shell commands, rendered with a decorative `$` prompt. A line that ends in `\` goes on in the next, indented
   * one, which has no prompt. Empty strings are blank lines.
   */
  | { kind: 'commands'; lines: readonly string[] }
  /** A config file: `file` is shown above the code but is never copied. */
  | { kind: 'config'; file: string; code: string };

export type Integration = {
  id: string;
  label: string;
  snippet: IntegrationSnippet;
};

export const INTEGRATION_COPY_LABELS = {
  commands: 'Copy Commands',
  // Draft copy — not in Figma
  config: 'Copy Config',
} as const satisfies Record<IntegrationSnippet['kind'], string>;

/** How every command starts: through npx, which needs nothing installed first. */
const CLI = 'npx @agentinbox/cli';

// Draft copy — not in Figma. The hosted MCP server, as the dashboard writes it for Cursor (`cursorMcpConfig`).
const MCP_SERVER_CONFIG = `{
  "mcpServers": {
    "inbox": { "url": "https://mcp.agentinbox.md" }
  }
}`;

// Each snippet works when copied onto a fresh computer: a send without `--to` reaches the person who ran setup.
export const INTEGRATIONS: readonly Integration[] = [
  {
    id: 'cli',
    label: 'CLI',
    snippet: {
      kind: 'commands',
      lines: [
        `${CLI} setup`,
        '',
        `${CLI} channel add telegram`,
        `${CLI} inbox list --filter unread`,
        // Single quotes: in double ones the shell would read `$2` as a variable.
        `${CLI} inbox send approve \\`,
        `    'Refund $240?'`,
      ],
    },
  },
  {
    id: 'claude',
    label: 'Claude',
    // Draft copy — not in Figma. Claude Code, taught by the skills; the Claude apps connect through MCP.
    snippet: {
      kind: 'commands',
      lines: [`${CLI} setup`, '', 'npx skills add agentinboxhq/skills --agent claude-code'],
    },
  },
  {
    id: 'cursor',
    label: 'Cursor',
    // Draft copy — not in Figma
    snippet: {
      kind: 'config',
      file: '~/.cursor/mcp.json',
      code: MCP_SERVER_CONFIG,
    },
  },
  {
    id: 'grok-bot',
    label: 'Grok Bot',
    // Draft copy — not in Figma
    snippet: {
      kind: 'commands',
      lines: [
        `${CLI} setup --agent-name "Grok Bot"`,
        '',
        `${CLI} channel add slack`,
        `${CLI} inbox send ask \\`,
        '    "Post the launch thread?"',
      ],
    },
  },
  {
    id: 'hermes',
    label: 'Hermes',
    // Draft copy — not in Figma
    snippet: {
      kind: 'commands',
      lines: [
        `${CLI} setup --agent-name Hermes`,
        '',
        `${CLI} channel add telegram`,
        `${CLI} inbox send choose \\`,
        '    "Friday or Monday?" --option Friday \\',
        '    --option Monday',
      ],
    },
  },
  {
    id: 'openclaw',
    label: 'OpenClaw',
    // Draft copy — not in Figma
    snippet: {
      kind: 'commands',
      lines: [
        `${CLI} setup --agent-name OpenClaw`,
        '',
        `${CLI} channel add slack`,
        `${CLI} inbox send \\`,
        '    "Nightly backup finished"',
      ],
    },
  },
  {
    id: 'dots',
    label: 'Dots',
    // Draft copy — not in Figma
    snippet: {
      kind: 'commands',
      lines: [
        `${CLI} setup --agent-name Dots`,
        '',
        // Outbound email starts once the setup is in an account.
        `${CLI} login`,
        `${CLI} channel add email`,
        `${CLI} inbox send approve \\`,
        '    "Send the Q3 invoice?"',
      ],
    },
  },
  {
    id: 'mcp',
    label: 'MCP',
    // Draft copy — not in Figma
    snippet: { kind: 'config', file: 'mcp.json', code: MCP_SERVER_CONFIG },
  },
];

/** Plain text for the clipboard: no `$` prompts, no file label. */
export function getIntegrationCopyText(snippet: IntegrationSnippet): string {
  return snippet.kind === 'commands' ? snippet.lines.join('\n') : snippet.code;
}
