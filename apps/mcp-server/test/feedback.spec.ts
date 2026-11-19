import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerFeedbackTool } from "../src/server/feedback";
import { callTool, connect, connectAllTools, textOf, tokenAccessors } from "./support";

const REPORT = {
	description: "Called create_workflow with a digest step; it rejected the unit.",
	impact: "worked_around",
	kind: "confusing",
	operation: "mcp__novu__create_workflow",
	task: "Create a digest workflow",
};

function stubFetch(
	status = 200,
	body: unknown = { created_at: "2026-11-18T00:00:00Z", id: "fb_1" },
) {
	const fetchMock = vi.fn(
		async (_url: URL | string, _init?: RequestInit) =>
			new Response(JSON.stringify(body), {
				headers: { "Content-Type": "application/json" },
				status,
			}),
	);
	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}

describe("submit_feedback", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("is not registered without a Clerk secret key", async () => {
		const server = new McpServer({ name: "test", version: "1.0.0" });
		registerFeedbackTool(server, undefined);
		registerFeedbackTool(server, "  ");
		const client = await connect(server);

		await expect(client.listTools()).rejects.toThrow();
	});

	it("posts the report to Clerk with the server name and the bare tool name", async () => {
		const fetchMock = stubFetch();
		const client = await connectAllTools(tokenAccessors("api-key"));

		const result = await callTool(client, "submit_feedback", REPORT);

		expect(result.isError).toBeFalsy();
		expect(result.structuredContent).toEqual({ feedback_id: "fb_1", received: true });
		const [url, init] = fetchMock.mock.calls[0];
		expect(String(url)).toBe("https://api.clerk.com/v1/feedback");
		expect(new Headers(init?.headers).get("authorization")).toBe("Bearer sk_test_feedback");
		const body = JSON.parse(String(init?.body));
		expect(body).toMatchObject({
			kind: "confusing",
			operation: "create_workflow",
			source: { name: "Novu MCP Server", type: "mcp", version: "1.0.0" },
		});
	});

	it("tells the agent not to retry when Clerk rate-limits", async () => {
		stubFetch(429, { errors: [] });
		vi.spyOn(console, "error").mockImplementation(() => {});
		const client = await connectAllTools(tokenAccessors("api-key"));

		const result = await callTool(client, "submit_feedback", REPORT);

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("Do not retry");
	});
});
