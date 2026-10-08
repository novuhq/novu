/** The AI tools the Agent page can connect Human to, through the hosted Human MCP server. */
export type ToolId = 'cursor' | 'claude' | 'chatgpt';

export type AiTool = {
  id: ToolId;
  name: string;
  /** How Human gets into the tool, under its name on the tile: "MCP", "Custom Connector". */
  label: string;
  /** The tool's logo, as exported from the design. */
  icon: string;
  /** Where the tool's connector settings are, for the two that are set up there. */
  settingsUrl?: string;
  /** The tool itself, to try it out once it's connected. */
  appUrl?: string;
  /** Something to say to the tool to see Human at work. */
  example: string;
};

/** In the order of the tiles on the Agent page. */
export const AI_TOOLS: AiTool[] = [
  { id: 'cursor', name: 'Cursor', label: 'MCP', icon: '/tools/cursor.png', example: 'Ask me before you deploy.' },
  {
    id: 'claude',
    name: 'Claude',
    label: 'Custom Connector',
    icon: '/tools/claude.png',
    settingsUrl: 'https://claude.ai/settings/connectors',
    appUrl: 'https://claude.ai',
    example: 'Check with me before you send this.',
  },
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    label: 'Create MCP App',
    icon: '/tools/chatgpt.png',
    settingsUrl: 'https://chatgpt.com/#settings',
    appUrl: 'https://chatgpt.com',
    example: 'Check with me before you send this.',
  },
];

const TOOL_IDS = new Set<string>(AI_TOOLS.map((tool) => tool.id));

export function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && TOOL_IDS.has(value);
}

/** The name the MCP server gets in a tool's own list of servers. */
const SERVER_NAME = 'human';

/** What goes into `~/.cursor/mcp.json` by hand. */
export function cursorMcpConfig(mcpUrl: string): string {
  return ['{', '  "mcpServers": {', `    "${SERVER_NAME}": { "url": ${JSON.stringify(mcpUrl)} }`, '  }', '}'].join(
    '\n'
  );
}

/** Cursor's own install link: it opens Cursor with the server filled in and one button to confirm. */
export function cursorInstallLink(mcpUrl: string): string {
  const query = new URLSearchParams({ name: SERVER_NAME, config: btoa(JSON.stringify({ url: mcpUrl })) });

  return `cursor://anysphere.cursor-deeplink/mcp/install?${query}`;
}
