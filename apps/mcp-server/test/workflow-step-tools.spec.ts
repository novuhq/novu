import { afterEach, describe, expect, it, vi } from "vitest";
import { fakeWorkflowsApi } from "./fake-api";
import { workflowResponseFixture } from "./fixtures/workflow-response";
import { callTool, connectAllTools, tokenAccessors } from "./support";

const smsStep = {
	controlValues: { body: "Code: {{payload.code}}" },
	name: "SMS Code",
	type: "sms",
};

async function client() {
	return connectAllTools(tokenAccessors("api-key"));
}

describe("workflow step tools", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	describe("add_workflow_step", () => {
		it("appends the step to the saved workflow and returns it", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "add_workflow_step", {
				step: smsStep,
				stepId: "SMS Code",
				workflowId: "welcome",
			});

			expect(api.requests.map((r) => `${r.method} ${r.path}`)).toEqual([
				"GET /v2/workflows/welcome",
				"PUT /v2/workflows/welcome",
			]);
			const put = api.puts[0].body!;
			expect(put.steps.map((s: { stepId: string }) => s.stepId)).toEqual([
				"in-app-step",
				"email-step",
				"chat-step",
				"sms-code",
			]);
			expect(put.preferences.workflow).toEqual(api.workflow.preferences.default);
			expect(result.isError).toBeFalsy();
			expect(result.structuredContent).toEqual({ workflow: api.workflow });
		});

		it("returns the workflow unchanged when the stepId already exists", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "add_workflow_step", {
				step: smsStep,
				stepId: "chat-step",
				workflowId: "welcome",
			});

			expect(api.puts).toHaveLength(0);
			expect(result.structuredContent).toEqual({ workflow: api.workflow });
		});
	});

	describe("insert_workflow_step", () => {
		it("places the step right after afterStepId", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "insert_workflow_step", {
				afterStepId: "in-app-step",
				step: smsStep,
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.steps.map((s: { name: string }) => s.name)).toEqual([
				"In-App Step",
				"SMS Code",
				"Email Step",
				"Chat Step",
			]);
		});

		it("rejects an unknown afterStepId with a 404", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "insert_workflow_step", {
				afterStepId: "nope",
				step: smsStep,
				workflowId: "welcome",
			});

			expect(api.puts).toHaveLength(0);
			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: { status: 404 } });
		});
	});

	describe("update_workflow_step_content", () => {
		it("replaces the step's content, keeps its conditions and stores email bodies as strings", async () => {
			const workflow = workflowResponseFixture();
			const skip = { "==": [{ var: "subscriber.isOnline" }, true] };
			Object.assign(workflow.steps[1].controlValues, { skip });
			const api = fakeWorkflowsApi(workflow);
			const doc = {
				content: [
					{
						attrs: { showIfKey: null, textAlign: "left" },
						content: [{ marks: [], text: "Hello again", type: "text" }],
						type: "paragraph",
					},
				],
				type: "doc",
			};

			await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: { body: doc, editorType: "block", subject: "Hello" },
					type: "email",
				},
				stepId: "email-step",
				workflowId: "welcome",
			});

			const step = api.puts[0].body!.steps[1];
			expect(step).toMatchObject({
				_id: "6650f0c2a1b2c3d4e5f60802",
				name: "Email Step",
				stepId: "email-step",
			});
			expect(step.controlValues).toEqual({
				body: JSON.stringify(doc),
				editorType: "block",
				skip,
				subject: "Hello",
			});
		});

		it("refuses to edit a step managed by a step resolver, even under a slugified id", async () => {
			const workflow = workflowResponseFixture();
			Object.assign(workflow.steps[0], { stepId: "Send In-App", stepResolverHash: "abc" });
			const api = fakeWorkflowsApi(workflow);

			const result = await callTool(await client(), "update_workflow_step_conditions", {
				stepId: "send-in-app",
				workflowId: "welcome",
			});

			expect(api.puts).toHaveLength(0);
			expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		});

		it("rejects content for a different step type with a 400", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: { controlValues: { body: "hi" }, type: "sms" },
				stepId: "email-step",
				workflowId: "welcome",
			});

			expect(api.puts).toHaveLength(0);
			expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		});
	});

	describe("update_workflow_step_conditions", () => {
		it("sets the step's skip condition and keeps its content", async () => {
			const api = fakeWorkflowsApi();
			const skip = { "==": [{ var: "subscriber.isOnline" }, true] };

			await callTool(await client(), "update_workflow_step_conditions", {
				skip,
				stepId: "in-app-step",
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.steps[0].controlValues).toEqual({
				body: "Welcome {{payload.name}}",
				skip,
				subject: "Hi",
			});
		});

		it("removes the skip condition when skip is omitted", async () => {
			const workflow = workflowResponseFixture();
			Object.assign(workflow.steps[0].controlValues, { skip: { "==": [1, 1] } });
			const api = fakeWorkflowsApi(workflow);

			await callTool(await client(), "update_workflow_step_conditions", {
				stepId: "in-app-step",
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.steps[0].controlValues).not.toHaveProperty("skip");
		});
	});

	describe("remove_workflow_step", () => {
		it("drops the step from the saved workflow", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "remove_workflow_step", {
				stepId: "email-step",
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.steps.map((s: { stepId: string }) => s.stepId)).toEqual([
				"in-app-step",
				"chat-step",
			]);
		});

		it("rejects an unknown stepId with a 404", async () => {
			fakeWorkflowsApi();

			const result = await callTool(await client(), "remove_workflow_step", {
				stepId: "nope",
				workflowId: "welcome",
			});

			expect(result.structuredContent).toMatchObject({ error: { status: 404 } });
		});
	});

	describe("move_workflow_step", () => {
		it("moves the step to the 0-based index, clamped to the last position", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "move_workflow_step", {
				stepId: "in-app-step",
				toIndex: 10,
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.steps.map((s: { stepId: string }) => s.stepId)).toEqual([
				"email-step",
				"chat-step",
				"in-app-step",
			]);
		});
	});

	describe("update_workflow_payload_schema", () => {
		it("adds and removes properties in the existing payload schema", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "update_workflow_payload_schema", {
				addProperties: [
					{ name: "order.total", type: "number" },
					{ isRequired: false, name: "coupon", type: "string" },
				],
				removeProperties: ["name"],
				workflowId: "welcome",
			});

			const put = api.puts[0].body!;
			expect(put.validatePayload).toBe(true);
			expect(put.payloadSchema).toEqual({
				additionalProperties: false,
				properties: {
					coupon: { type: "string" },
					order: {
						additionalProperties: false,
						properties: { total: { type: "number" } },
						required: ["total"],
						type: "object",
					},
				},
				required: ["order"],
				type: "object",
			});
		});

		it("turns payload validation off once no properties are left", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "update_workflow_payload_schema", {
				removeProperties: ["name"],
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.validatePayload).toBe(false);
		});
	});

	describe("update_workflow_metadata", () => {
		it("changes only the given fields and keeps steps and preferences", async () => {
			const api = fakeWorkflowsApi();
			const before = workflowResponseFixture();

			await callTool(await client(), "update_workflow_metadata", {
				name: "Welcome v2",
				tags: ["onboarding", "v2"],
				workflowId: "welcome",
			});

			const put = api.puts[0].body!;
			expect(put).toMatchObject({
				description: before.description,
				name: "Welcome v2",
				preferences: {
					user: before.preferences.user,
					workflow: before.preferences.default,
				},
				severity: before.severity,
				tags: ["onboarding", "v2"],
			});
			expect(put.steps).toHaveLength(3);
		});

		it("makes a critical workflow ignore subscriber preferences", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "update_workflow_metadata", {
				critical: true,
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.preferences.user.all).toEqual({
				enabled: true,
				readOnly: true,
			});
		});
	});

	describe("every step tool", () => {
		it("forwards __source and the idempotency key with the PUT", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "remove_workflow_step", {
				__source: "ai",
				idempotencyKey: "key-1",
				stepId: "chat-step",
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.__source).toBe("ai");
			expect(api.puts[0].headers.get("idempotency-key")).toBe("key-1");
		});

		it("reports the status of a failed save", async () => {
			const api = fakeWorkflowsApi();
			api.failNext("PUT", 503, { message: "unavailable" });

			const result = await callTool(await client(), "remove_workflow_step", {
				stepId: "chat-step",
				workflowId: "welcome",
			});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: { status: 503 } });
		});
	});
});
