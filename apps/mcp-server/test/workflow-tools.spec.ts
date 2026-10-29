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

	it("sends channel preferences and HTTP response schemas in the API's shape", async () => {
		const api = fakeWorkflowsApi();
		const httpStep = {
			controlValues: {
				method: "GET",
				responseBodySchema: { properties: { id: { type: "string" } }, type: "object" },
				url: "https://example.com",
			},
			name: "Lookup",
			type: "http_request",
		};

		const result = await callTool(await client(), "create_workflow", {
			name: "Prefs",
			preferences: {
				workflow: { all: { enabled: true }, channels: { email: { enabled: false } } },
			},
			steps: [httpStep],
		});

		expect(result.isError).toBeFalsy();
		expect(api.requests[0].body).toMatchObject({
			preferences: { workflow: { channels: { email: { enabled: false } } } },
			steps: [{ controlValues: httpStep.controlValues }],
		});
	});

	it("keeps nested HTTP response fields", async () => {
		const api = fakeWorkflowsApi();
		const responseBodySchema = {
			properties: {
				customer: {
					properties: { id: { type: "string" } },
					required: ["id"],
					type: "object",
				},
			},
			type: "object",
		};

		await callTool(await client(), "create_workflow", {
			name: "Nested",
			steps: [
				{
					controlValues: {
						method: "GET",
						responseBodySchema,
						url: "https://example.com",
					},
					name: "Lookup",
					type: "http_request",
				},
			],
		});

		expect(api.requests[0].body).toMatchObject({
			steps: [{ controlValues: { responseBodySchema } }],
		});
	});

	it("maps critical to read-only subscriber preferences", async () => {
		const api = fakeWorkflowsApi();

		await callTool(await client(), "create_workflow", {
			critical: true,
			name: "Password reset",
			steps: [inAppStep],
		});

		const body = api.requests[0].body as Record<string, unknown>;
		expect(body.critical).toBeUndefined();
		expect(body).toMatchObject({
			preferences: { user: { all: { enabled: true, readOnly: true } } },
		});
	});

	it("builds nested properties for array items in dot notation", async () => {
		const api = fakeWorkflowsApi();

		await callTool(await client(), "create_workflow", {
			name: "Orders",
			payloadProperties: [
				{
					arrayItemProperties: [{ name: "address.city", type: "string" }],
					arrayItemsType: "object",
					name: "orders",
					type: "array",
				},
			],
			steps: [inAppStep],
		});

		expect(api.requests[0].body).toMatchObject({
			payloadSchema: {
				properties: {
					orders: {
						items: {
							properties: {
								address: {
									properties: { city: { type: "string" } },
									required: ["city"],
								},
							},
							required: ["address"],
						},
					},
				},
			},
		});
	});

	it("creates a workflow with no steps", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "create_workflow", {
			name: "Empty",
			steps: [],
		});

		expect(result.isError).toBeFalsy();
		expect(api.requests[0].body).toMatchObject({ steps: [] });
	});

	it("requires the parents of a required nested property", async () => {
		const api = fakeWorkflowsApi();

		await callTool(await client(), "create_workflow", {
			name: "Orders",
			payloadProperties: [
				{ name: "order.total", type: "number" },
				{ isRequired: false, name: "meta.source", type: "string" },
			],
			steps: [inAppStep],
		});

		const schema = (api.requests[0].body as { payloadSchema: Record<string, unknown> })
			.payloadSchema;
		expect(schema.required).toEqual(["order"]);
		expect(schema).toMatchObject({
			properties: { meta: { required: [] }, order: { required: ["total"] } },
		});
	});

	it("keeps an explicitly optional parent optional, whichever entry comes first", async () => {
		const parent = { isRequired: false, name: "order", type: "object" };
		const child = { name: "order.total", type: "number" };

		for (const payloadProperties of [
			[parent, child],
			[child, parent],
		]) {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "create_workflow", {
				name: "Orders",
				payloadProperties,
				steps: [inAppStep],
			});

			const schema = (api.requests[0].body as { payloadSchema: Record<string, unknown> })
				.payloadSchema;
			expect(schema).toMatchObject({
				properties: {
					order: { properties: { total: { type: "number" } }, required: ["total"] },
				},
				required: [],
			});
			vi.unstubAllGlobals();
		}
	});

	it("flags rejected step validation as an error", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "create_workflow", {
			name: "Bad HTTP",
			steps: [
				{
					controlValues: {
						body: [{ key: "a", value: "b" }],
						method: "GET",
						url: "https://x.io",
					},
					name: "Call",
					type: "http_request",
				},
			],
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		expect(api.requests).toHaveLength(0);
	});

	it("creates a dynamic delay that reads its wait from the payload", async () => {
		const api = fakeWorkflowsApi();
		const delayStep = {
			controlValues: { dynamicKey: "payload.sendAt", type: "dynamic" },
			name: "Wait",
			type: "delay",
		};

		const result = await callTool(await client(), "create_workflow", {
			name: "Reminder",
			payloadProperties: [{ name: "sendAt", type: "string" }],
			steps: [delayStep, inAppStep],
		});

		expect(result.isError).toBeFalsy();
		expect(api.requests[0].body).toMatchObject({
			steps: [{ controlValues: delayStep.controlValues }, {}],
		});
	});

	it("rejects a dynamic delay key missing from the payload schema", async () => {
		const api = fakeWorkflowsApi();

		const result = await callTool(await client(), "create_workflow", {
			name: "Reminder",
			payloadProperties: [{ name: "name", type: "string" }],
			steps: [
				{
					controlValues: { dynamicKey: "payload.sendAt", type: "dynamic" },
					name: "Wait",
					type: "delay",
				},
			],
		});

		expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		expect(api.requests).toHaveLength(0);
	});

	it("rejects boolean channel preferences", async () => {
		fakeWorkflowsApi();

		const result = await callTool(await client(), "create_workflow", {
			name: "Prefs",
			preferences: { workflow: { channels: { email: false } } },
		});

		expect(result.isError).toBe(true);
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
