import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerWorkflowTools, WORKFLOW_TOOL_NAMES } from "../src/tools/index";
import { API_URL, callTool, connect, connectAllTools, textOf, tokenAccessors } from "./support";

function stubFetch(body: unknown = { data: [] }, status = 200) {
	const fetchMock = vi.fn(
		async (_url: string, _init?: RequestInit) =>
			new Response(JSON.stringify(body), {
				headers: { "Content-Type": "application/json" },
				status,
			}),
	);
	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}

describe("the Novu MCP server tools", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("lists every tool the hosted server registers", async () => {
		const client = await connectAllTools(tokenAccessors("api-key"));

		const { tools } = await client.listTools();

		expect(tools.map((tool) => tool.name).sort()).toMatchInlineSnapshot(`
			[
			  "add_workflow_step",
			  "bulk_trigger_workflow",
			  "cancel_triggered_event",
			  "connect_agent",
			  "create_agent",
			  "create_subscriber",
			  "create_workflow",
			  "delete_integration",
			  "delete_subscriber",
			  "delete_workflow",
			  "find_subscribers",
			  "get_active_integrations",
			  "get_agent",
			  "get_agents",
			  "get_conversation_activities",
			  "get_conversations",
			  "get_environments",
			  "get_integrations",
			  "get_notification",
			  "get_notifications",
			  "get_subscriber",
			  "get_subscriber_preferences",
			  "get_workflow",
			  "get_workflows",
			  "insert_workflow_step",
			  "move_workflow_step",
			  "remove_workflow_step",
			  "set_primary_integration",
			  "trigger_workflow",
			  "update_agent",
			  "update_subscriber",
			  "update_subscriber_preferences",
			  "update_workflow",
			  "update_workflow_metadata",
			  "update_workflow_payload_schema",
			  "update_workflow_step_conditions",
			  "update_workflow_step_content",
			  "whoami",
			]
		`);
	});

	it("exports a name constant for every tool the ./tools entry registers", async () => {
		const server = new McpServer({ name: "tools", version: "1.0.0" });
		registerWorkflowTools(server, tokenAccessors("api-key"));

		const { tools } = await (await connect(server)).listTools();

		expect(tools.map((tool) => tool.name).sort()).toEqual(
			Object.values(WORKFLOW_TOOL_NAMES).sort(),
		);
	});

	it("asks a caller without a credential to sign in", async () => {
		const client = await connectAllTools(tokenAccessors(null));

		const result = await callTool(client, "get_workflows");

		expect(textOf(result)).toContain("Not authenticated");
	});

	it("sends an API key with the ApiKey scheme", async () => {
		const fetchMock = stubFetch();
		const client = await connectAllTools(tokenAccessors("api-key"));

		await callTool(client, "get_workflows");

		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe(`${API_URL}/v2/workflows`);
		expect(new Headers(init?.headers).get("Authorization")).toBe("ApiKey api-key");
	});

	it("sends an OAuth token as Bearer and targets the chosen environment", async () => {
		const fetchMock = stubFetch();
		const client = await connectAllTools(tokenAccessors("oat_token"));

		await callTool(client, "get_workflows", { environmentId: "env-1" });

		const headers = new Headers(fetchMock.mock.calls[0][1]?.headers);
		expect(headers.get("Authorization")).toBe("Bearer oat_token");
		expect(headers.get("Novu-Environment-Id")).toBe("env-1");
	});

	it("reports the deployment region from whoami", async () => {
		stubFetch({ data: { _id: "user-1", email: "a@example.test" } });
		const client = await connectAllTools(tokenAccessors("api-key"), "eu");

		const result = await callTool(client, "whoami");

		expect(textOf(result)).toContain("Server: EU");
	});
});
