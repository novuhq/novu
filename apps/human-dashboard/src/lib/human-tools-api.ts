import 'server-only';

import type { ToolId } from './ai-tools';
import type { HumanAccount } from './human-account';

/**
 * The address of the hosted Human MCP server that ChatGPT, Claude and Cursor connect to, such as
 * `https://mcp.human.md`. `null` while it isn't configured: the Agent page then keeps its tool tiles as
 * links to the docs instead of opening steps that can't work.
 */
export function readMcpUrl(): string | null {
  return process.env.HUMAN_MCP_URL?.trim().replace(/\/$/, '') || null;
}

/**
 * The AI tools that have signed in to the account through the MCP server.
 *
 * The API can't tell yet: the MCP server (NV-8973) is what will record a tool's sign-in. Until it does,
 * no tool reads as connected, and the pages are built against this function so only it has to change.
 */
export async function listConnectedTools(_account: HumanAccount): Promise<ToolId[]> {
  return [];
}
