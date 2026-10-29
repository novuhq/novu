import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type CallToolResult, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { registerAgentTools } from "../src/tools/agents";
import { registerAuthTools } from "../src/tools/auth";
import { registerConversationTools } from "../src/tools/conversations";
import { registerEnvironmentTools } from "../src/tools/environments";
import { registerIntegrationTools } from "../src/tools/integrations";
import { registerNotificationTools } from "../src/tools/notifications";
import { registerPreferenceTools } from "../src/tools/preferences";
import { registerSubscriberTools } from "../src/tools/subscribers";
import { registerWorkflowTools } from "../src/tools/workflows";
import type { ToolAccessors } from "../src/utils/tool-accessors";

export const API_URL = "https://api.example.test";

/**
 * Registers every tool module the way `NovuMCP.registerAllTools` does, without
 * the Durable Object (which needs the Workers runtime), and connects a client
 * over an in-memory transport.
 */
export async function connectAllTools(accessors: ToolAccessors, region = "us"): Promise<Client> {
	const server = new McpServer({ name: "Novu MCP Server", version: "1.0.0" });
	registerAuthTools(server, accessors, () => region);
	registerAgentTools(server, accessors);
	registerConversationTools(server, accessors);
	registerWorkflowTools(server, accessors);
	registerEnvironmentTools(server, accessors);
	registerSubscriberTools(server, accessors);
	registerNotificationTools(server, accessors);
	registerPreferenceTools(server, accessors);
	registerIntegrationTools(server, accessors);

	return connect(server);
}

export async function connect(server: McpServer): Promise<Client> {
	const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
	const client = new Client({ name: "test", version: "1.0.0" });
	await Promise.all([server.connect(serverTransport), client.connect(clientTransport)]);

	return client;
}

export function tokenAccessors(token: string | null): ToolAccessors {
	return { getApiUrl: () => API_URL, getToken: () => token };
}

export async function callTool(
	client: Client,
	name: string,
	args: Record<string, unknown> = {},
): Promise<CallToolResult> {
	return CallToolResultSchema.parse(await client.callTool({ arguments: args, name }));
}

export function textOf(result: CallToolResult): string {
	return result.content.map((part) => (part.type === "text" ? part.text : "")).join("\n");
}
