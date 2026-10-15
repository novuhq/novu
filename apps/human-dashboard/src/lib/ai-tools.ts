/** The chat apps that connect to Agent Inbox through its hosted MCP server. */
export type ToolId = 'cursor' | 'claude' | 'chatgpt';

export type AiTool = {
  id: ToolId;
  name: string;
  /** How Agent Inbox gets into the app, under its name in the list: "Custom connector", "MCP server". */
  label: string;
  /** The app's logo, as exported from the design. */
  icon: string;
  /** Where the app's connector settings are, for the two that are set up there. */
  settingsUrl?: string;
  /** The app itself, to try it out once it's connected. */
  appUrl?: string;
  /** Something to ask the app to see the inbox at work. */
  example: string;
};

const EXAMPLE = 'What’s new in your inbox?';

/** In the order of the design's "Chat apps" list. */
export const AI_TOOLS: AiTool[] = [
  {
    id: 'chatgpt',
    name: 'ChatGPT',
    label: 'Custom connector',
    icon: '/tools/chatgpt.png',
    settingsUrl: 'https://chatgpt.com/#settings',
    appUrl: 'https://chatgpt.com',
    example: EXAMPLE,
  },
  {
    id: 'claude',
    name: 'Claude',
    label: 'Custom connector',
    icon: '/tools/claude.png',
    settingsUrl: 'https://claude.ai/settings/connectors',
    appUrl: 'https://claude.ai',
    example: EXAMPLE,
  },
  { id: 'cursor', name: 'Cursor', label: 'MCP server', icon: '/tools/cursor.png', example: EXAMPLE },
];

const TOOL_IDS = new Set<string>(AI_TOOLS.map((tool) => tool.id));

export function isToolId(value: unknown): value is ToolId {
  return typeof value === 'string' && TOOL_IDS.has(value);
}

/** The name the MCP server gets in a tool's own list of servers. */
const SERVER_NAME = 'inbox';

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
