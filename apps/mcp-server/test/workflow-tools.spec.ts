import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWorkflowsApi } from "./fake-api";
import { callTool, connectAllTools, tokenAccessors } from "./support";

const inAppStep = {
	controlValues: { body: "Hi {{payload.name}}", subject: "Hi" },
	name: "In-App",
	type: "in_app",
};

async function client() {
	return connectAllTools(tokenAccessors("api-key"));
}

describe("create_workflow", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("derives the workflowId from the name and returns the created workflow", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "create_workflow", {
			name: "Order Shipped!",
			steps: [inAppStep],
		});

		expect(api.requests[0].body).toMatchObject({ workflowId: "order-shipped" });
		expect(result.structuredContent).toEqual({ workflow: api.workflow });
	});

	it("retries a taken slug with a suffix and its own idempotency key", async () => {
		const api = fakeWorkflowsApi();
		api.failNext("POST", 409, { message: "Workflow with the same id already exists" });

		const result = await callTool(await client(), "create_workflow", {
			idempotencyKey: "create-1",
			name: "Order Shipped",
		});

		const [first, second] = api.requests.map((r) => ({
			key: r.headers.get("idempotency-key"),
			workflowId: r.body?.workflowId,
		}));
		expect(first).toEqual({ key: "create-1", workflowId: "order-shipped" });
		expect(second.workflowId).toMatch(/^order-shipped-[a-z0-9]{4,}$/);
		expect(second.key).not.toBe("create-1");
		expect(result.isError).toBeFalsy();
	});

	it("picks the same suffix again when the caller retries with the same idempotency key", async () => {
		const suffixed: string[] = [];
		for (let attempt = 0; attempt < 2; attempt++) {
			const api = fakeWorkflowsApi();
			api.failNext("POST", 409, { message: "taken" });
			await callTool(await client(), "create_workflow", {
				idempotencyKey: "create-1",
				name: "Order Shipped",
			});
			suffixed.push(api.requests[1].body!.workflowId);
			vi.unstubAllGlobals();
		}

		expect(suffixed[0]).toBe(suffixed[1]);
	});

	it("does not retry a 409 that asks to retry later (idempotency key in progress)", async () => {
		const api = fakeWorkflowsApi();
		api.failNext("POST", 409, { message: "in progress" }, { "Retry-After": "1" });

		const result = await callTool(await client(), "create_workflow", {
			idempotencyKey: "create-1",
			name: "Order Shipped",
		});

		expect(api.requests).toHaveLength(1);
		expect(result.structuredContent).toMatchObject({ error: { retryAfter: "1", status: 409 } });
	});

	it("does not rename a workflowId the caller chose", async () => {
		const api = fakeWorkflowsApi();
		api.failNext("POST", 409, { message: "taken" });

		const result = await callTool(await client(), "create_workflow", {
			name: "Order Shipped",
			workflowId: "orders",
		});

		expect(api.requests).toHaveLength(1);
		expect(result.structuredContent).toMatchObject({ error: { status: 409 } });
	});
});

describe("update_workflow", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("forwards __source and returns the saved workflow", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "update_workflow", {
			__source: "ai",
			name: "Welcome",
			origin: "novu-cloud",
			steps: [inAppStep],
			workflowId: "welcome",
		});

		expect(api.puts[0].body!.__source).toBe("ai");
		expect(result.structuredContent).toEqual({ workflow: api.workflow });
	});
});
