import 'server-only';

import { cache } from 'react';

import { isToolId, type ToolId } from './ai-tools';
import { AGENT_INBOX_DASHBOARD_SECRET_HEADER } from './constants';
import type { HumanAccount } from './human-account';

/**
 * The address of the hosted Human MCP server that ChatGPT, Claude and Cursor connect to, such as
 * `https://mcp.agentinbox.md`. `null` while it isn't configured: the Agent page then keeps its tool tiles as
 * links to the docs instead of opening steps that can't work.
 */
export function readMcpUrl(): string | null {
  return process.env.AGENT_INBOX_MCP_URL?.trim().replace(/\/$/, '') || null;
}

/** A slow MCP server must not hold up the Agent page: the tiles then read as not connected yet. */
const CONNECTIONS_TIMEOUT_MS = 4_000;

/**
 * The AI tools that have signed in to the account through the MCP server, which remembers each
 * sign-in. It answers only to the secret this server shares with the Novu API.
 *
 * Nothing reads as connected when the server isn't configured or can't be asked: a tile that says
 * "Connect" for a connected tool is a smaller mistake than one that says "Connected" for none.
 *
 * The onboarding's progress and the Configure page of one request share a single lookup, so a server
 * that doesn't answer holds the page up once, not twice.
 */
export const listConnectedTools = cache(async (account: HumanAccount): Promise<ToolId[]> => {
  const mcpUrl = readMcpUrl();
  const secret = process.env.AGENT_INBOX_DASHBOARD_API_SECRET;
  if (!mcpUrl || !secret) {
    return [];
  }

  try {
    const response = await fetch(`${mcpUrl}/connections/${encodeURIComponent(account.humanUserId)}`, {
      headers: { [AGENT_INBOX_DASHBOARD_SECRET_HEADER]: secret },
      cache: 'no-store',
      signal: AbortSignal.timeout(CONNECTIONS_TIMEOUT_MS),
    });
    if (!response.ok) {
      return [];
    }

    const body = (await response.json()) as { data?: Record<string, unknown> } | null;

    return Object.keys(body?.data ?? {}).filter(isToolId);
  } catch {
    return [];
  }
});
