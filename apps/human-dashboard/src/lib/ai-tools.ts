/**
 * The hosts that sign in through the hosted MCP server, which tells them apart by the app that signed in. The
 * list of hosts, these among them, is `hosts.ts`; this file only keeps the names the MCP side of the
 * dashboard (`host-status.ts`, `human-tools-api.ts`) imports.
 */
export { isToolId, type ToolId } from './hosts';
