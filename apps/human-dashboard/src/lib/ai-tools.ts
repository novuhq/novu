/**
 * The hosts the hosted MCP server tells apart by the app that signed in: Cursor, Claude and ChatGPT. The
 * list of hosts, these among them, is `hosts.ts`; this file only keeps the names the MCP side of the
 * dashboard (`host-status.ts`, `human-tools-api.ts`) imports.
 */
export { isToolId, type ToolId } from './hosts';
