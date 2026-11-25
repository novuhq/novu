import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { type CallToolResult, CallToolResultSchema } from "@modelcontextprotocol/sdk/types.js";
import { registerHostedTools } from "../src/server/hosted-tools";
import type { ToolAccessors } from "../src/utils/tool-accessors";

export const API_URL = "https://api.example.test";

/**
 * Registers the hosted server's tools with the function `NovuMCP` uses, without
 * the Durable Object (which needs the Workers runtime), and connects a client
 * over an in-memory transport.
 */
export async function connectAllTools(accessors: ToolAccessors, region = "us"): Promise<Client> {
	const server = new McpServer({ name: "Novu MCP Server", version: "1.0.0" });
	registerHostedTools(server, {
		accessors,
		feedbackSecretKey: "sk_test_feedback",
		getRegion: () => region,
	});

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
