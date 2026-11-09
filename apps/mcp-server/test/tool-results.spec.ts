import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, callTool, connectAllTools, tokenAccessors } from "./support";

function stubFetch(body: unknown, status: number, headers: Record<string, string> = {}) {
	const fetchMock = vi.fn(
		async (_url: string, _init?: RequestInit) =>
			new Response(typeof body === "string" ? body : JSON.stringify(body), {
				headers: { "Content-Type": "application/json", ...headers },
				status,
			}),
	);
	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}

describe("tool results", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("exposes the HTTP status of a failed API call", async () => {
		stubFetch({ message: "Workflow not found", statusCode: 404 }, 404);
		const client = await connectAllTools(tokenAccessors("api-key"));

		const result = await callTool(client, "get_workflow", { workflowId: "missing" });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: { message: expect.stringContaining("Workflow not found"), status: 404 },
		});
	});

	it("asks the caller for a fresh Authorization value on every request", async () => {
		const fetchMock = stubFetch({ data: [] }, 200);
		let minted = 0;
		const client = await connectAllTools({
			getApiUrl: () => API_URL,
			getAuthorization: async () => `Internal jwt-${++minted}`,
			getToken: () => null,
		});

		await callTool(client, "get_workflows");
		await callTool(client, "get_workflows");

		const authorizations = fetchMock.mock.calls.map(([, init]) =>
			new Headers(init?.headers).get("Authorization"),
		);
		expect(authorizations).toEqual(["Internal jwt-1", "Internal jwt-2"]);
	});
});
