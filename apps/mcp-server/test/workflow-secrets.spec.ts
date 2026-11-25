import { afterEach, describe, expect, it, vi } from "vitest";
import {
	HIDDEN_SECRET,
	redactHttpRequestControlValues,
	redactWorkflowSecrets,
	restoreStepSecrets,
} from "../src/tools/index";
import { restoreWorkflowSecrets } from "../src/utils/workflow-secrets";
import { fakeWorkflowsApi } from "./fake-api";
import { workflowResponseFixture } from "./fixtures/workflow-response";
import { callTool, connectAllTools, textOf, tokenAccessors } from "./support";

const TOKEN = "sk_live_51NvQx8Lk2Jd9PzQ4";
const SLACK_SECRET = "A1b2C3d4E5f6G7h8I9j0K1l2";

function httpControlValues() {
	return {
		body: JSON.stringify({
			apiKey: TOKEN,
			count: 3,
			nested: { orderId: "{{payload.orderId}}", password: "hunter2" },
		}),
		headers: [
			{ key: "Content-Type", value: "application/json" },
			{ key: "Authorization", value: `Bearer ${TOKEN}` },
			{ key: "X-Signature", value: "Bearer {{env.SIGNING_KEY}}" },
			{ key: "X-Api-Key", value: "plain-key-123" },
		],
		method: "POST",
		timeout: 5000,
		url: `https://ops:${TOKEN}@hooks.slack.com/services/T0001/B0001/${SLACK_SECRET}?channel=alerts&token={{env.SLACK_TOKEN}}#frag`,
	};
}

function httpStep(controlValues: Record<string, unknown> = httpControlValues()) {
	return {
		_id: "6650f0c2a1b2c3d4e5f60804",
		controls: { dataSchema: {}, uiSchema: {}, values: controlValues },
		controlValues,
		issues: {},
		name: "Notify Ops",
		origin: "novu-cloud",
		slug: "notify-ops_st_6650f0c2a1b2c3d4e5f60804",
		stepId: "notify-ops",
		type: "http_request",
		variables: { properties: {}, type: "object" },
		workflowDatabaseId: "6650f0c2a1b2c3d4e5f60718",
		workflowId: "welcome",
	};
}

function workflowWithHttpStep() {
	const workflow = workflowResponseFixture();

	return { ...workflow, steps: [...workflow.steps, httpStep()] };
}

describe("redactHttpRequestControlValues", () => {
	const redacted = redactHttpRequestControlValues(httpControlValues());

	it("hides header values except safe headers and template-only values", () => {
		expect(redacted.headers).toEqual([
			{ key: "Content-Type", value: "application/json" },
			{ key: "Authorization", value: HIDDEN_SECRET },
			{ key: "X-Signature", value: "Bearer {{env.SIGNING_KEY}}" },
			{ key: "X-Api-Key", value: HIDDEN_SECRET },
		]);
	});

	it("keeps a JSON body's keys, numbers and template-only strings", () => {
		expect(JSON.parse(redacted.body as string)).toEqual({
			apiKey: HIDDEN_SECRET,
			count: 3,
			nested: { orderId: "{{payload.orderId}}", password: HIDDEN_SECRET },
		});
	});

	it("keeps the URL's host and path, without its user info, token segments and literal query values", () => {
		expect(redacted.url).toBe(
			`https://${HIDDEN_SECRET}@hooks.slack.com/services/T0001/B0001/${HIDDEN_SECRET}?channel=${HIDDEN_SECRET}&token={{env.SLACK_TOKEN}}#${HIDDEN_SECRET}`,
		);
	});

	it("keeps the other control values", () => {
		expect(redacted).toMatchObject({ method: "POST", timeout: 5000 });
	});

	it("never lets a secret through", () => {
		const text = JSON.stringify(redacted);

		expect(text).not.toContain(TOKEN);
		expect(text).not.toContain(SLACK_SECRET);
		expect(text).not.toContain("hunter2");
		expect(text).not.toContain("plain-key-123");
	});

	it("hides a body that isn't JSON unless it is only templates", () => {
		expect(redactHttpRequestControlValues({ body: `token=${TOKEN}` }).body).toBe(HIDDEN_SECRET);
		expect(redactHttpRequestControlValues({ body: "{{payload | json}}" }).body).toBe(
			"{{payload | json}}",
		);
	});

	it("hides key-value body values that aren't templates", () => {
		expect(
			redactHttpRequestControlValues({
				body: [
					{ key: "secret", value: TOKEN },
					{ key: "orderId", value: "{{payload.orderId}}" },
				],
			}).body,
		).toEqual([
			{ key: "secret", value: HIDDEN_SECRET },
			{ key: "orderId", value: "{{payload.orderId}}" },
		]);
	});

	it("keeps a template URL and a token inside a template whole", () => {
		expect(redactHttpRequestControlValues({ url: "{{payload.webhookUrl}}" }).url).toBe(
			"{{payload.webhookUrl}}",
		);
		expect(
			redactHttpRequestControlValues({
				url: "https://api.telegram.org/bot{{env.BOT_TOKEN}}/sendMessage?chat_id={{subscriber.data.chatId}}",
			}).url,
		).toBe(
			"https://api.telegram.org/bot{{env.BOT_TOKEN}}/sendMessage?chat_id={{subscriber.data.chatId}}",
		);
		expect(
			redactHttpRequestControlValues({
				url: "https://api.telegram.org/bot123456:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw/sendMessage",
			}).url,
		).toBe(`https://api.telegram.org/${HIDDEN_SECRET}/sendMessage`);
	});
});

describe("redactWorkflowSecrets", () => {
	it("hides HTTP request step secrets in the control values and the controls metadata", () => {
		const text = JSON.stringify(redactWorkflowSecrets({ data: workflowWithHttpStep() }));

		expect(text).not.toContain(TOKEN);
		expect(text).not.toContain(SLACK_SECRET);
		expect(text).toContain(HIDDEN_SECRET);
	});

	it("leaves other step types as they are", () => {
		const workflow = workflowResponseFixture();

		expect(redactWorkflowSecrets(workflow)).toEqual(workflow);
	});
});

describe("restoreStepSecrets", () => {
	const saved = httpStep();
	const shown = redactHttpRequestControlValues(httpControlValues());

	it("puts the stored values back when the shown values are sent back unchanged", () => {
		const result = restoreStepSecrets({ ...saved, controlValues: shown }, saved);

		expect(result).toEqual({
			ok: true,
			value: { ...saved, controlValues: httpControlValues() },
		});
	});

	it("restores a header by name in any case, next to an edited one", () => {
		const result = restoreStepSecrets(
			{
				controlValues: {
					...shown,
					headers: [
						{ key: "authorization", value: HIDDEN_SECRET },
						{ key: "X-Trace", value: "{{payload.traceId}}" },
					],
				},
				stepId: "notify-ops",
				type: "http_request",
			},
			saved,
		);

		expect(result.ok && result.value.controlValues?.headers).toEqual([
			{ key: "authorization", value: `Bearer ${TOKEN}` },
			{ key: "X-Trace", value: "{{payload.traceId}}" },
		]);
	});

	it("restores JSON body values by path when the body was edited", () => {
		const body = JSON.stringify({
			apiKey: HIDDEN_SECRET,
			count: 4,
			nested: { orderId: "{{payload.orderId}}", password: HIDDEN_SECRET },
		});
		const result = restoreStepSecrets(
			{ controlValues: { ...shown, body }, stepId: "notify-ops", type: "http_request" },
			saved,
		);

		expect(result.ok && JSON.parse(result.value.controlValues?.body as string)).toEqual({
			apiKey: TOKEN,
			count: 4,
			nested: { orderId: "{{payload.orderId}}", password: "hunter2" },
		});
	});

	it("restores key-value body values sent back for a stored JSON body", () => {
		const result = restoreStepSecrets(
			{
				controlValues: {
					...shown,
					body: [
						{ key: "apiKey", value: HIDDEN_SECRET },
						{ key: "orderId", value: "{{payload.orderId}}" },
					],
				},
				stepId: "notify-ops",
				type: "http_request",
			},
			saved,
		);

		expect(result.ok && result.value.controlValues?.body).toEqual([
			{ key: "apiKey", value: TOKEN },
			{ key: "orderId", value: "{{payload.orderId}}" },
		]);
	});

	it("refuses a placeholder with no stored value at that place", () => {
		const result = restoreStepSecrets(
			{
				controlValues: { ...shown, headers: [{ key: "X-New", value: HIDDEN_SECRET }] },
				stepId: "notify-ops",
				type: "http_request",
			},
			saved,
		);

		expect(result.ok).toBe(false);
		expect(!result.ok && result.error).toContain(
			'The headers of HTTP request step "notify-ops"',
		);
	});

	it("refuses an edited URL that still holds a placeholder", () => {
		const result = restoreStepSecrets(
			{
				controlValues: { ...shown, url: `${shown.url}&extra=1` },
				stepId: "notify-ops",
				type: "http_request",
			},
			saved,
		);

		expect(!result.ok && result.error).toContain("The url of");
	});

	it("refuses placeholders in a new step, so they are never copied", () => {
		expect(restoreStepSecrets({ ...httpStep(shown), _id: undefined }, undefined).ok).toBe(
			false,
		);
	});

	it("matches steps by _id, then stepId", () => {
		const result = restoreWorkflowSecrets(
			[
				{
					controlValues: shown,
					name: "Notify Ops",
					stepId: "notify-ops",
					type: "http_request",
				},
			],
			[saved],
		);

		expect(result.ok && result.value[0].controlValues).toEqual(httpControlValues());
	});
});

describe("workflow tools keep HTTP request step secrets from the caller", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	async function client() {
		return connectAllTools(tokenAccessors("api-key"));
	}

	it("get_workflow hides them", async () => {
		fakeWorkflowsApi(workflowWithHttpStep());

		const text = textOf(
			await callTool(await client(), "get_workflow", { workflowId: "welcome" }),
		);

		expect(text).toContain("Successfully fetched workflow welcome:");
		expect(text).not.toContain(TOKEN);
		expect(text).not.toContain(SLACK_SECRET);
		expect(text).toContain(HIDDEN_SECRET);
	});

	it("update_workflow saves the stored values for the placeholders get_workflow showed", async () => {
		const api = fakeWorkflowsApi(workflowWithHttpStep());
		const { _id, controlValues, name, type } = redactWorkflowSecrets(api.workflow).steps.at(-1);

		const result = await callTool(await client(), "update_workflow", {
			name: "Welcome",
			origin: "novu-cloud",
			steps: [{ _id, controlValues, name, type }],
			workflowId: "welcome",
		});

		expect(result.isError).toBeFalsy();
		expect(api.requests.map((r) => r.method)).toEqual(["GET", "PUT"]);
		const put = api.puts[0].body!;
		expect(put.steps[0].controlValues).toEqual(httpControlValues());
		expect(JSON.stringify(put)).not.toContain(HIDDEN_SECRET);
	});

	it("update_workflow reads the stored workflow only when a placeholder was sent", async () => {
		const api = fakeWorkflowsApi();

		await callTool(await client(), "update_workflow", {
			name: "Welcome",
			origin: "novu-cloud",
			steps: [{ controlValues: { body: "Hi" }, name: "SMS", type: "sms" }],
			workflowId: "welcome",
		});

		expect(api.requests.map((r) => r.method)).toEqual(["PUT"]);
	});

	it("update_workflow_step_content saves the stored values for the placeholders", async () => {
		const api = fakeWorkflowsApi(workflowWithHttpStep());
		const shown = redactHttpRequestControlValues(httpControlValues());

		const result = await callTool(await client(), "update_workflow_step_content", {
			content: { controlValues: { ...shown, timeout: 8000 }, type: "http_request" },
			stepId: "notify-ops",
			workflowId: "welcome",
		});

		expect(result.isError).toBeFalsy();
		expect(api.puts[0].body!.steps.at(-1).controlValues).toEqual({
			...httpControlValues(),
			timeout: 8000,
		});
	});

	it("update_workflow_step_content refuses a placeholder with no stored value", async () => {
		const api = fakeWorkflowsApi(workflowWithHttpStep());
		const shown = redactHttpRequestControlValues(httpControlValues());

		const result = await callTool(await client(), "update_workflow_step_content", {
			content: {
				controlValues: { ...shown, headers: [{ key: "X-Other", value: HIDDEN_SECRET }] },
				type: "http_request",
			},
			stepId: "notify-ops",
			workflowId: "welcome",
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		expect(api.puts).toHaveLength(0);
	});

	it.each([
		["add_workflow_step", {}],
		["insert_workflow_step", { afterStepId: "in-app-step" }],
	])("%s refuses a step that copies placeholders", async (tool, extra) => {
		const api = fakeWorkflowsApi(workflowWithHttpStep());
		const shown = redactHttpRequestControlValues(httpControlValues());

		const result = await callTool(await client(), tool, {
			...extra,
			step: { controlValues: shown, name: "Copy", type: "http_request" },
			workflowId: "welcome",
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain(HIDDEN_SECRET);
		expect(api.puts).toHaveLength(0);
	});

	it("create_workflow refuses a workflow that copies placeholders", async () => {
		const api = fakeWorkflowsApi();
		const shown = redactHttpRequestControlValues(httpControlValues());

		const result = await callTool(await client(), "create_workflow", {
			name: "Copy",
			steps: [{ controlValues: shown, name: "Notify", type: "http_request" }],
		});

		expect(result.isError).toBe(true);
		expect(api.requests).toHaveLength(0);
	});
});
