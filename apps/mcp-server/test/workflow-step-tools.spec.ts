import { afterEach, describe, expect, it, vi } from "vitest";
import { toSavedControlValues } from "../src/tools/index";
import { fakeWorkflowsApi } from "./fake-api";
import { dashboardEmailBodies } from "./fixtures/dashboard-email-bodies";
import { workflowResponseFixture } from "./fixtures/workflow-response";
import { callTool, connectAllTools, textOf, tokenAccessors } from "./support";

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

		it("accepts the null skip the dashboard saves for a step without conditions", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "add_workflow_step", {
				step: { ...smsStep, controlValues: { ...smsStep.controlValues, skip: null } },
				workflowId: "welcome",
			});

			expect(result.isError).toBeFalsy();
			expect(api.puts[0].body!.steps.at(-1).controlValues).toEqual({
				body: "Code: {{payload.code}}",
				skip: null,
			});
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

		it.each([
			["null, as the dashboard saves a cleared condition", null],
			["one the step tools reject", { and: [{ and: [] }] }],
		])("ignores a skip sent with the content: %s", async (_label, contentSkip) => {
			const workflow = workflowResponseFixture();
			const skip = { "==": [{ var: "subscriber.isOnline" }, true] };
			Object.assign(workflow.steps[0].controlValues, { skip });
			const api = fakeWorkflowsApi(workflow);

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: { body: "Updated", skip: contentSkip, subject: "Hi" },
					type: "in_app",
				},
				stepId: "in-app-step",
				workflowId: "welcome",
			});

			expect(result.isError).toBeFalsy();
			expect(api.puts[0].body!.steps[0].controlValues).toEqual({
				body: "Updated",
				skip,
				subject: "Hi",
			});
		});

		it("saves the sender settings of an email and the data of an in-app step with their content", async () => {
			const api = fakeWorkflowsApi();
			const sender = {
				from: { email: "orders@acme.dev", name: "Acme" },
				preheader: "Your order is on its way",
				replyTo: "support@acme.dev",
				useProviderDefaults: false,
			};
			const data = { orderId: "{{payload.orderId}}" };

			await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: {
						body: "<p>Shipped</p>",
						editorType: "html",
						subject: "Shipped",
						...sender,
					},
					type: "email",
				},
				stepId: "email-step",
				workflowId: "welcome",
			});
			await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: { body: "Shipped", data, subject: "Shipped" },
					type: "in_app",
				},
				stepId: "in-app-step",
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.steps[1].controlValues).toMatchObject(sender);
			expect(api.puts[1].body!.steps[0].controlValues.data).toEqual(data);
		});

		it.each(Object.entries(dashboardEmailBodies))(
			"keeps a %s exactly as the dashboard's editor saved it",
			async (_name, body) => {
				const api = fakeWorkflowsApi();

				const result = await callTool(await client(), "update_workflow_step_content", {
					content: {
						controlValues: { body, editorType: "block", subject: "Hello" },
						type: "email",
					},
					stepId: "email-step",
					workflowId: "welcome",
				});

				expect(result.isError).toBeFalsy();
				expect(JSON.parse(api.puts[0].body!.steps[1].controlValues.body)).toEqual(body);
			},
		);

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

		it("saves unformatted email text that has no marks", async () => {
			const api = fakeWorkflowsApi();
			const doc = {
				content: [
					{ attrs: null, content: [{ text: "Hello", type: "text" }], type: "paragraph" },
				],
				type: "doc",
			};

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: { body: doc, editorType: "block", subject: "Hello" },
					type: "email",
				},
				stepId: "email-step",
				workflowId: "welcome",
			});

			expect(result.isError).toBeFalsy();
			expect(api.puts[0].body!.steps[1].controlValues.body).toBe(JSON.stringify(doc));
		});

		it("saves the dashboard editor's defaults for the email body attributes a node leaves out", async () => {
			const api = fakeWorkflowsApi();
			const button = { attrs: { text: "Open", url: "https://example.com" }, type: "button" };
			const image = { attrs: { src: "https://example.com/a.png" }, type: "image" };

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: {
						body: {
							content: [{ content: [button], type: "paragraph" }, image],
							type: "doc",
						},
						editorType: "block",
						subject: "Hello",
					},
					type: "email",
				},
				stepId: "email-step",
				workflowId: "welcome",
			});

			expect(result.isError).toBeFalsy();
			const [paragraph, savedImage] = JSON.parse(
				api.puts[0].body!.steps[1].controlValues.body,
			).content;
			expect(paragraph.attrs).toEqual({ showIfKey: null, textAlign: null });
			expect(paragraph.content[0].attrs).toMatchObject({
				alignment: "left",
				borderRadius: "smooth",
				buttonColor: "#000000",
				paddingLeft: 32,
				paddingTop: 10,
				showIfKey: null,
				text: "Open",
				textColor: "#ffffff",
				url: "https://example.com",
				variant: "filled",
			});
			expect(savedImage.attrs).toMatchObject({
				alignment: "center",
				height: "auto",
				isSrcVariable: false,
				width: "auto",
			});
		});

		it("gives a section the same editor defaults whether attrs is omitted or empty, and keeps an explicit null", async () => {
			const api = fakeWorkflowsApi();
			const paragraph = { content: [{ text: "Hi", type: "text" }], type: "paragraph" };
			const sections = [{}, { attrs: {} }, { attrs: null }].map((attrs) => ({
				...attrs,
				content: [paragraph],
				type: "section",
			}));

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: {
						body: { content: sections, type: "doc" },
						editorType: "block",
						subject: "Hello",
					},
					type: "email",
				},
				stepId: "email-step",
				workflowId: "welcome",
			});

			expect(result.isError).toBeFalsy();
			const [omitted, empty, explicitNull] = JSON.parse(
				api.puts[0].body!.steps[1].controlValues.body,
			).content;
			expect(omitted.attrs).toMatchObject({ backgroundColor: "#f7f7f7", borderRadius: 6 });
			expect(empty.attrs).toEqual(omitted.attrs);
			expect(explicitNull.attrs).toBeNull();
		});

		it("rejects a container node without its content, as the dashboard never saves one", async () => {
			const api = fakeWorkflowsApi();
			const list = { items: [{ type: "listItem" }], type: "bulletList" };

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: {
						body: { content: [list], type: "doc" },
						editorType: "block",
						subject: "Hello",
					},
					type: "email",
				},
				stepId: "email-step",
				workflowId: "welcome",
			});

			expect(api.requests).toHaveLength(0);
			expect(textOf(result)).toContain("at content.controlValues.body.content[0].content");
		});

		it("names the allowed heading levels", async () => {
			const api = fakeWorkflowsApi();
			const heading = { attrs: { level: 4 }, content: [], type: "heading" };

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: {
					controlValues: {
						body: { content: [heading], type: "doc" },
						editorType: "block",
						subject: "Hello",
					},
					type: "email",
				},
				stepId: "email-step",
				workflowId: "welcome",
			});

			expect(api.requests).toHaveLength(0);
			expect(textOf(result)).toContain(
				"expected one of 1|2|3 at content.controlValues.body.content[0].attrs.level",
			);
		});

		it("explains the request body format when it is neither a string nor key-value pairs", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "add_workflow_step", {
				step: {
					controlValues: { body: { id: 1 }, method: "POST", url: "https://example.com" },
					name: "Notify",
					type: "http_request",
				},
				workflowId: "welcome",
			});

			expect(api.requests).toHaveLength(0);
			expect(textOf(result)).toContain(
				"Invalid request body: expected a JSON string such as",
			);
			expect(textOf(result)).toContain("at step.controlValues.body");
		});

		it("rejects a raw HTTP body on a method that does not send one", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "add_workflow_step", {
				step: {
					controlValues: { body: '{"id":1}', method: "GET", url: "https://example.com" },
					name: "Fetch",
					type: "http_request",
				},
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

		it("points trigger and custom step content to update_workflow", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "update_workflow_step_content", {
				content: { controlValues: {}, type: "custom" },
				stepId: "chat-step",
				workflowId: "welcome",
			});

			expect(api.requests).toHaveLength(0);
			expect(textOf(result)).toContain(
				"edit trigger and custom steps with update_workflow at content.type",
			);
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

		it.each([
			["omitted", {}],
			["null", { skip: null }],
		])("removes the skip condition when skip is %s", async (_label, args) => {
			const workflow = workflowResponseFixture();
			Object.assign(workflow.steps[0].controlValues, { skip: { "==": [1, 1] } });
			const api = fakeWorkflowsApi(workflow);

			const result = await callTool(await client(), "update_workflow_step_conditions", {
				...args,
				stepId: "in-app-step",
				workflowId: "welcome",
			});

			expect(result.isError).toBeFalsy();
			expect(api.puts[0].body!.steps[0].controlValues).not.toHaveProperty("skip");
		});

		it("rejects a bare variable and an empty and/or group, which the dashboard shows as no conditions", async () => {
			const api = fakeWorkflowsApi();

			for (const skip of [{ var: "payload.isTest" }, { and: [] }, { or: [] }]) {
				const result = await callTool(await client(), "update_workflow_step_conditions", {
					skip,
					stepId: "in-app-step",
					workflowId: "welcome",
				});

				expect(result.isError).toBe(true);
			}
			expect(api.requests).toHaveLength(0);
		});

		it("explains the condition format when the condition matches none of its forms", async () => {
			const api = fakeWorkflowsApi();

			for (const skip of [
				{ "===": [{ var: "payload.tier" }, "gold"] },
				{ and: [{ var: "payload.x" }] },
			]) {
				const result = await callTool(await client(), "update_workflow_step_conditions", {
					skip,
					stepId: "in-app-step",
					workflowId: "welcome",
				});

				expect(textOf(result)).toContain("Invalid skip condition: expected one comparison");
				expect(textOf(result)).toContain("at skip");
			}
			expect(api.requests).toHaveLength(0);
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

		it("finds a step by the unslugified id get_workflow returned", async () => {
			const workflow = workflowResponseFixture();
			workflow.steps[1].stepId = "Email Step";
			const api = fakeWorkflowsApi(workflow);

			await callTool(await client(), "remove_workflow_step", {
				stepId: "Email Step",
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

		it("keeps a declared object open so its keys still validate", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "update_workflow_payload_schema", {
				addProperties: [{ name: "duration", type: "object" }],
				workflowId: "welcome",
			});

			expect(api.puts[0].body!.payloadSchema.properties.duration).toEqual({
				properties: {},
				required: [],
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

		it("reads a leading payload. as the variable prefix, not as a nested payload object", async () => {
			const api = fakeWorkflowsApi();

			await callTool(await client(), "update_workflow_payload_schema", {
				addProperties: [
					{ isRequired: false, name: "payload.orderId", type: "string" },
					{ name: "payload.order.total", type: "number" },
				],
				removeProperties: ["payload.name"],
				workflowId: "welcome",
			});

			const schema = api.puts[0].body!.payloadSchema;
			expect(Object.keys(schema.properties)).toEqual(["orderId", "order"]);
			expect(schema.required).toEqual(["order"]);
			expect(schema.properties.order.properties).toEqual({ total: { type: "number" } });
		});

		it("strips one payload. only, so payload.payload names a top-level property named payload", async () => {
			const workflow = workflowResponseFixture();
			workflow.payloadSchema.properties = {
				...workflow.payloadSchema.properties,
				payload: { properties: {}, required: [], type: "object" },
			} as typeof workflow.payloadSchema.properties;
			const api = fakeWorkflowsApi(workflow);

			await callTool(await client(), "update_workflow_payload_schema", {
				removeProperties: ["payload.payload"],
				workflowId: "welcome",
			});

			expect(Object.keys(api.puts[0].body!.payloadSchema.properties)).toEqual(["name"]);
		});

		it.each([
			[
				"an empty name",
				{ addProperties: [{ name: "", type: "string" }] },
				"addProperties[0].name",
			],
			[
				"a name that is only the payload. prefix",
				{ addProperties: [{ name: "payload.", type: "string" }] },
				"addProperties[0].name",
			],
			[
				"a path that ends in a dot",
				{ addProperties: [{ name: "order.", type: "number" }] },
				"addProperties[0].name",
			],
			[
				"an array item path with an empty name",
				{
					addProperties: [
						{
							arrayItemProperties: [{ name: "address..city", type: "string" }],
							arrayItemsType: "object",
							name: "orders",
							type: "array",
						},
					],
				},
				"addProperties[0].arrayItemProperties[0].name",
			],
			["a removal of payload.", { removeProperties: ["payload."] }, "removeProperties[0]"],
		])("rejects %s before any request", async (_label, args, path) => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "update_workflow_payload_schema", {
				...args,
				workflowId: "welcome",
			});

			expect(result.isError).toBe(true);
			expect(textOf(result)).toContain("Must name a property");
			expect(textOf(result)).toContain(`at ${path}`);
			expect(api.requests).toHaveLength(0);
		});

		it.each([
			["an enum without its values", { name: "tier", type: "enum" }, "enumValues"],
			["an array without its item type", { name: "tags", type: "array" }, "arrayItemsType"],
		])("reports %s at the missing field", async (_label, property, field) => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "update_workflow_payload_schema", {
				addProperties: [property],
				workflowId: "welcome",
			});

			expect(textOf(result)).toContain(`at addProperties[0].${field}`);
			expect(api.requests).toHaveLength(0);
		});

		it("removes a top-level property named payload", async () => {
			const workflow = workflowResponseFixture();
			workflow.payloadSchema.properties = {
				...workflow.payloadSchema.properties,
				payload: { properties: {}, required: [], type: "object" },
			} as typeof workflow.payloadSchema.properties;
			const api = fakeWorkflowsApi(workflow);

			await callTool(await client(), "update_workflow_payload_schema", {
				removeProperties: ["payload"],
				workflowId: "welcome",
			});

			expect(Object.keys(api.puts[0].body!.payloadSchema.properties)).toEqual(["name"]);
		});
	});

	describe("addPayloadProperties", () => {
		const declared = [
			{ name: "code", type: "string" },
			{ isRequired: false, name: "payload.expiresAt", type: "string" },
		];
		const declaredSchema = {
			additionalProperties: false,
			properties: {
				code: { type: "string" },
				expiresAt: { type: "string" },
				name: { type: "string" },
			},
			required: ["name", "code"],
			type: "object",
		};

		const unvalidatedFixture = () => {
			const workflow = workflowResponseFixture();
			workflow.validatePayload = false;

			return workflow;
		};

		it.each([
			["add_workflow_step", { step: smsStep }],
			["insert_workflow_step", { afterStepId: "in-app-step", step: smsStep }],
			[
				"update_workflow_step_content",
				{
					content: { controlValues: { body: "{{payload.code}}" }, type: "chat" },
					stepId: "chat-step",
				},
			],
			[
				"update_workflow_step_conditions",
				{ skip: { "==": [{ var: "payload.code" }, "x"] }, stepId: "chat-step" },
			],
			["update_workflow_metadata", { name: "Welcome v2" }],
		])(
			"%s declares them in the same PUT and turns payload validation on",
			async (tool, args) => {
				const api = fakeWorkflowsApi(unvalidatedFixture());

				const result = await callTool(await client(), tool, {
					...args,
					addPayloadProperties: declared,
					workflowId: "welcome",
				});

				expect(result.isError).toBeFalsy();
				expect(api.requests.map((r) => r.method)).toEqual(["GET", "PUT"]);
				expect(api.puts[0].body!.payloadSchema).toEqual(declaredSchema);
				expect(api.puts[0].body!.validatePayload).toBe(true);
				expect(textOf(result)).toContain("declared the payload properties code, expiresAt");
			},
		);

		it.each([
			["omitted", undefined],
			["empty", []],
		])(
			"leaves the payload schema and its validation as they are when %s",
			async (_label, properties) => {
				const api = fakeWorkflowsApi(unvalidatedFixture());

				await callTool(await client(), "add_workflow_step", {
					addPayloadProperties: properties,
					step: smsStep,
					workflowId: "welcome",
				});

				expect(api.puts[0].body!.payloadSchema).toEqual(
					workflowResponseFixture().payloadSchema,
				);
				expect(api.puts[0].body!.validatePayload).toBe(false);
			},
		);

		it("saves nothing when the step already exists and says the payload properties were not declared", async () => {
			const api = fakeWorkflowsApi();

			const result = await callTool(await client(), "add_workflow_step", {
				addPayloadProperties: declared,
				step: smsStep,
				stepId: "chat-step",
				workflowId: "welcome",
			});

			expect(api.puts).toHaveLength(0);
			expect(textOf(result)).toContain(
				'Step "chat-step" already exists, so nothing was saved, including the payload properties code, expiresAt. If this call retries the one that added the step, that call declared them in the same save',
			);
		});

		it("keeps the plain message when a step that already exists came without payload properties", async () => {
			fakeWorkflowsApi();

			const result = await callTool(await client(), "insert_workflow_step", {
				afterStepId: "in-app-step",
				step: smsStep,
				stepId: "chat-step",
				workflowId: "welcome",
			});

			expect(textOf(result).split(":\n\n")[0]).toBe('Step "chat-step" already exists');
		});

		it.each([
			["add_workflow_step", { step: smsStep }],
			["update_workflow_metadata", { name: "Welcome v2" }],
		])(
			"%s rejects a payload property that names no property, before any request",
			async (tool, args) => {
				const api = fakeWorkflowsApi();

				const result = await callTool(await client(), tool, {
					...args,
					addPayloadProperties: [{ name: "payload.", type: "string" }],
					workflowId: "welcome",
				});

				expect(result.isError).toBe(true);
				expect(textOf(result)).toContain("at addPayloadProperties[0].name");
				expect(api.requests).toHaveLength(0);
			},
		);

		it("is offered, as an optional field, only by the tools that change steps or metadata", async () => {
			const { tools } = await (await client()).listTools();

			const offering = tools
				.filter((tool) => tool.inputSchema.properties?.addPayloadProperties)
				.map((tool) => tool.name)
				.sort();
			expect(offering).toEqual([
				"add_workflow_step",
				"insert_workflow_step",
				"update_workflow_metadata",
				"update_workflow_step_conditions",
				"update_workflow_step_content",
			]);
			for (const tool of tools) {
				expect(tool.inputSchema.required ?? []).not.toContain("addPayloadProperties");
			}
		});
	});

	describe("toSavedControlValues", () => {
		const doc = {
			content: [
				{
					attrs: { showIfKey: null, textAlign: "left" },
					content: [{ marks: [], text: "Hi {{payload.name}}", type: "text" }],
					type: "paragraph",
				},
			],
			type: "doc",
		};

		it("matches the control values the step tools save, key order included", async () => {
			const api = fakeWorkflowsApi();
			const inApp = {
				controlValues: {
					body: "Body",
					redirect: { url: "/orders" },
					subject: "Hi",
					unknown: "x",
				},
				type: "in_app",
			};
			const email = {
				controlValues: { body: doc, editorType: "block", subject: "Hello" },
				type: "email",
			};

			await callTool(await client(), "add_workflow_step", {
				step: { ...inApp, name: "Inbox" },
				workflowId: "welcome",
			});
			await callTool(await client(), "update_workflow_step_content", {
				content: email,
				stepId: "email-step",
				workflowId: "welcome",
			});

			const added = api.puts[0].body!.steps.at(-1).controlValues;
			expect(toSavedControlValues(inApp)).toEqual(added);
			expect(Object.keys(toSavedControlValues(inApp)!)).toEqual(Object.keys(added));
			expect(Object.keys(added)).toEqual(["body", "redirect", "subject"]);
			expect(toSavedControlValues(email)).toEqual(api.puts[1].body!.steps[1].controlValues);
			expect(toSavedControlValues(email)!.body).toBe(JSON.stringify(doc));
		});

		it("returns undefined for content the step tools reject", () => {
			expect(
				toSavedControlValues({ controlValues: { body: 1 }, type: "sms" }),
			).toBeUndefined();
			expect(toSavedControlValues({ controlValues: {}, type: "trigger" })).toBeUndefined();
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
