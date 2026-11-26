import { afterEach, describe, expect, it, vi } from "vitest";
import {
	HIDDEN_SECRET,
	redactHttpRequestControlValues,
	redactStepSecrets,
	redactWorkflowSecrets,
	restoreStepSecrets,
} from "../src/tools/index";
import { restoreWorkflowSecrets } from "../src/utils/workflow-secrets";
import { fakeWorkflowsApi, stubApi } from "./fake-api";
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

describe("redactHttpRequestControlValues: values that look safe and aren't", () => {
	const urlOf = (url: string) => redactHttpRequestControlValues({ url }).url;

	it("hides a quoted literal inside a Liquid tag", () => {
		const { headers } = redactHttpRequestControlValues({
			headers: [
				{ key: "Authorization", value: "Bearer {{ env.X | default: 'sk_live_abc123' }}" },
				{ key: "X-Token", value: "{% assign t = 'sk_live_abc' %}{{ t }}" },
			],
		});

		expect(JSON.stringify(headers)).not.toContain("sk_live");
	});

	it("hides a long mixed-case path segment without digits", () => {
		expect(urlOf("https://hooks.example.com/services/AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEf")).toBe(
			`https://hooks.example.com/services/${HIDDEN_SECRET}`,
		);
	});

	it("hides the user info of a protocol-relative URL and path parameter values", () => {
		expect(urlOf("//ops:hunter2@example.com/a")).toBe(`//${HIDDEN_SECRET}@example.com/a`);
		expect(urlOf("https://example.com/a;token=abc123;v=1")).toBe(
			`https://example.com/a;token=${HIDDEN_SECRET};v=${HIDDEN_SECRET}`,
		);
	});

	it("hides a short id that mixes letters and digits, such as a catch hook's", () => {
		expect(urlOf("https://hooks.zapier.com/hooks/catch/123456/abc1d2e/")).toBe(
			`https://hooks.zapier.com/hooks/catch/123456/${HIDDEN_SECRET}/`,
		);
	});

	it("shows a redacted value the same when it is redacted again", () => {
		const once = redactHttpRequestControlValues(httpControlValues());

		expect(redactHttpRequestControlValues(once)).toEqual(once);
	});
});

describe("restoreStepSecrets: ambiguous places are refused, never guessed", () => {
	const restore = (
		controlValues: Record<string, unknown>,
		saved: Record<string, unknown>,
		_id?: string,
	) =>
		restoreStepSecrets(
			{ _id, controlValues, stepId: "notify-ops", type: "http_request" },
			{ controlValues: saved, stepId: "notify-ops", type: "http_request" },
		);

	it("refuses an array item placeholder once the array changed length", () => {
		const saved = { body: JSON.stringify({ keys: ["secret-A", "secret-B"] }) };

		expect(restore({ body: JSON.stringify({ keys: [HIDDEN_SECRET] }) }, saved).ok).toBe(false);
		expect(
			restore({ body: JSON.stringify({ keys: [HIDDEN_SECRET, HIDDEN_SECRET] }) }, saved),
		).toMatchObject({ ok: true });
	});

	it("restores a header from its exact-case name first, and refuses a name two headers share", () => {
		const saved = {
			headers: [
				{ key: "x-token", value: "secret-lower" },
				{ key: "X-Token", value: "secret-upper" },
			],
		};

		const exact = restore({ headers: [{ key: "X-Token", value: HIDDEN_SECRET }] }, saved);
		expect(exact.ok && exact.value.controlValues?.headers).toEqual([
			{ key: "X-Token", value: "secret-upper" },
		]);
		expect(restore({ headers: [{ key: "X-TOKEN", value: HIDDEN_SECRET }] }, saved).ok).toBe(
			false,
		);
	});

	it("catches a placeholder spelled with escapes in a JSON body, and a cut-short one", () => {
		const saved = { body: JSON.stringify({ apiKey: TOKEN }) };
		const escaped = `{"apiKey":"${"\\u2022".repeat(8)}"}`;

		const result = restore({ body: escaped }, saved);
		expect(result.ok && JSON.parse(result.value.controlValues?.body as string)).toEqual({
			apiKey: TOKEN,
		});
		expect(restore({ body: JSON.stringify({ apiKey: "•••••••" }) }, saved).ok).toBe(false);
	});

	it("restores a nested JSON value the Copilot sends back as a pair's JSON text", () => {
		const saved = {
			body: JSON.stringify({ auth: { key: TOKEN }, orderId: "{{payload.orderId}}" }),
		};

		const result = restore(
			{
				body: [
					{ key: "auth", value: `{ "key": "${HIDDEN_SECRET}" }` },
					{ key: "orderId", value: "{{payload.orderId}}" },
				],
			},
			saved,
		);

		// Back as the stored JSON body, with the nested object as an object, not its JSON text.
		expect(result.ok && JSON.parse(result.value.controlValues?.body as string)).toEqual({
			auth: { key: TOKEN },
			orderId: "{{payload.orderId}}",
		});
	});

	it("refuses to keep hidden header or body values on a URL moved to another host", () => {
		const saved = {
			headers: [{ key: "Authorization", value: `Bearer ${TOKEN}` }],
			url: "https://api.example.com/hooks",
		};
		const headers = [{ key: "Authorization", value: HIDDEN_SECRET }];

		const moved = restore({ headers, url: "https://attacker.example/collect" }, saved);
		expect(!moved.ok && moved.error).toContain("now points at another host");
		expect(restore({ headers, url: "https://api.example.com/hooks/v2" }, saved).ok).toBe(true);
	});

	it("refuses a host change inside a Liquid expression that holds a slash", () => {
		const saved = {
			headers: [{ key: "Authorization", value: `Bearer ${TOKEN}` }],
			url: "https://{{ payload.host | remove: '/' | default: 'api.example.com' }}/hook",
		};

		const result = restore(
			{
				headers: [{ key: "Authorization", value: HIDDEN_SECRET }],
				url: "https://{{ payload.host | remove: '/' | default: 'attacker.example' }}/hook",
			},
			saved,
		);

		expect(!result.ok && result.error).toContain("now points at another host");
	});

	it("refuses a case change inside a Liquid expression, which reads another variable", () => {
		const saved = {
			headers: [{ key: "Authorization", value: `Bearer ${TOKEN}` }],
			url: "https://{{payload.host}}.example.com/hook",
		};
		const headers = [{ key: "Authorization", value: HIDDEN_SECRET }];

		const renamed = restore(
			{ headers, url: "https://{{payload.Host}}.example.com/hook" },
			saved,
		);
		expect(!renamed.ok && renamed.error).toContain("now points at another host");
		expect(
			restore({ headers, url: "https://{{payload.host}}.EXAMPLE.com/hook" }, saved).ok,
		).toBe(true);
	});

	it("refuses a host change hidden in the user info or behind a backslash", () => {
		const saved = {
			headers: [{ key: "Authorization", value: `Bearer ${TOKEN}` }],
			url: "https://api.stripe.com/v1/charges",
		};
		const headers = [{ key: "Authorization", value: HIDDEN_SECRET }];

		for (const url of [
			"https://{{payload.host}}@api.stripe.com/v1/charges",
			"https://evil.example\\@api.stripe.com/v1/charges",
		]) {
			const result = restore({ headers, url }, saved);
			expect(!result.ok && result.error).toContain("now points at another host");
		}
	});

	it("refuses to keep hidden values next to a raw filter the step didn't have", () => {
		const saved = {
			headers: [
				{ key: "Authorization", value: `Bearer ${TOKEN}` },
				{ key: "X-Trace", value: "{{ payload.trace | raw }}" },
			],
			url: "https://api.example.com/hooks",
		};
		const kept = [
			{ key: "Authorization", value: HIDDEN_SECRET },
			{ key: "X-Trace", value: "{{ payload.trace | raw }}" },
		];

		expect(restore({ headers: kept, url: saved.url }, saved).ok).toBe(true);
		const injected = restore(
			{
				headers: [
					...kept,
					{ key: "X-Inject", value: "{{ payload.x | url_decode | raw }}" },
				],
				url: saved.url,
			},
			saved,
		);
		expect(!injected.ok && injected.error).toContain("can rewrite the request");
	});

	it.each([
		["an echo tag in a new header", { key: "X-Inject", value: "{% echo payload.x %}" }],
		["a cycle tag in a new header", { key: "X-Inject", value: "{% cycle payload.x, 'b' %}" }],
		[
			"a liquid echo in a new header",
			{ key: "X-Inject", value: "{% liquid echo payload.x %}" },
		],
		["an unclosed output that spans fields", { key: "X-Inject", value: "{{ payload.x" }],
	])(
		"refuses to keep hidden values next to %s, which can rewrite the rendered request",
		(_, header) => {
			const saved = {
				headers: [{ key: "Authorization", value: `Bearer ${TOKEN}` }],
				url: "https://api.example.com/hooks",
			};

			const result = restore(
				{
					headers: [{ key: "Authorization", value: HIDDEN_SECRET }, header],
					url: saved.url,
				},
				saved,
			);

			expect(!result.ok && result.error).toContain("can rewrite the request");
		},
	);

	it("refuses a tag spanning the URL path and a response schema key", () => {
		const saved = {
			headers: [{ key: "Authorization", value: `Bearer ${TOKEN}` }],
			url: "https://api.example.com/hooks",
		};

		const result = restore(
			{
				headers: [{ key: "Authorization", value: HIDDEN_SECRET }],
				responseBodySchema: { properties: { "{% endcomment %}": { type: "string" } } },
				url: "https://api.example.com/hooks{% comment %}",
			},
			saved,
		);

		expect(result.ok).toBe(false);
	});

	it("keeps hidden values next to new {{ variable }} output and a new path on the same host", () => {
		const saved = {
			body: JSON.stringify({ orderId: "{{payload.orderId}}" }),
			headers: [{ key: "Authorization", value: `Bearer ${TOKEN}` }],
			url: "https://api.example.com/hooks",
		};

		const result = restore(
			{
				body: JSON.stringify({
					orderId: "{{payload.orderId}}",
					total: "{{ payload.total | round }}",
				}),
				headers: [{ key: "Authorization", value: HIDDEN_SECRET }],
				url: "https://api.example.com/hooks/v2/{{payload.region}}",
			},
			saved,
		);

		expect(result.ok && result.value.controlValues?.headers).toEqual(saved.headers);
	});

	it("tells a new step it can't copy hidden values, rather than blaming a host", () => {
		const result = restoreStepSecrets(
			{
				controlValues: {
					headers: [{ key: "X-Api-Key", value: HIDDEN_SECRET }],
					url: "https://a.example",
				},
				name: "Copy",
				type: "http_request",
			},
			undefined,
		);

		expect(!result.ok && result.error).toContain("A new step can't copy hidden values");
		expect(!result.ok && result.error).not.toContain("another host");
	});

	it("refuses a placeholder spelled with escapes in a body that isn't valid JSON", () => {
		const saved = { body: `{"n": {{payload.n}}, "key": "${TOKEN}"}` };
		const escaped = `{"n": {{payload.n}}, "key": "${"\\u2022".repeat(8)}"}`;

		expect(restore({ body: escaped }, saved).ok).toBe(false);
	});

	it("matches the stored step by _id before stepId", () => {
		const result = restoreWorkflowSecrets(
			[
				{
					_id: "id-a",
					controlValues: { headers: [{ key: "X-Api-Key", value: HIDDEN_SECRET }] },
					stepId: "step-b",
					type: "http_request",
				},
			],
			[
				{
					_id: "id-b",
					controlValues: { headers: [{ key: "X-Api-Key", value: "key-b" }] },
					stepId: "step-b",
					type: "http_request",
				},
				{
					_id: "id-a",
					controlValues: { headers: [{ key: "X-Api-Key", value: "key-a" }] },
					stepId: "step-a",
					type: "http_request",
				},
			],
		);

		expect(result.ok && result.value[0].controlValues?.headers).toEqual([
			{ key: "X-Api-Key", value: "key-a" },
		]);
	});
});

describe("redactWorkflowSecrets", () => {
	it("hides HTTP request step secrets in the control values and the controls metadata", () => {
		const text = JSON.stringify(redactWorkflowSecrets({ data: workflowWithHttpStep() }));

		expect(text).not.toContain(TOKEN);
		expect(text).not.toContain(SLACK_SECRET);
		expect(text).toContain(HIDDEN_SECRET);
	});

	it("hides the text of a header, body or URL issue, which can quote the broken value", () => {
		const step = {
			...httpStep(),
			issues: {
				controls: {
					"headers.1.value": [
						{
							issueType: "ILLEGAL_VARIABLE_IN_CONTROL_VALUE",
							message: `Content compilation error: output "{{ '${TOKEN}' | appen..." not closed`,
							variableName: "{{}}",
						},
					],
					timeout: [
						{
							issueType: "INVALID",
							message: "Timeout must be at least 100",
							variableName: "timeout",
						},
					],
				},
			},
		};

		const redacted = redactStepSecrets(step);

		expect(JSON.stringify(redacted)).not.toContain(TOKEN);
		expect(redacted.issues.controls["headers.1.value"][0]).toMatchObject({
			issueType: "ILLEGAL_VARIABLE_IN_CONTROL_VALUE",
			variableName: "headers.1.value",
		});
		expect(redacted.issues.controls.timeout).toEqual(step.issues.controls.timeout);
	});

	it("hides one step's secrets, in its control values and controls metadata", () => {
		const text = JSON.stringify(redactStepSecrets(httpStep()));

		expect(text).not.toContain(TOKEN);
		expect(redactStepSecrets(workflowResponseFixture().steps[0])).toEqual(
			workflowResponseFixture().steps[0],
		);
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

		expect(result.ok && JSON.parse(String(result.value.controlValues?.body))).toEqual({
			apiKey: TOKEN,
			orderId: "{{payload.orderId}}",
		});
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

	it("get_workflows hides a listed HTTP request step's issue text", async () => {
		stubApi({
			"/v2/workflows": {
				totalCount: 1,
				workflows: [
					{
						name: "Welcome",
						slug: "welcome_wf_1",
						steps: [
							{
								issues: {
									controls: {
										"headers.0.value": [
											{
												issueType: "ILLEGAL_VARIABLE_IN_CONTROL_VALUE",
												message: `output "{{ '${TOKEN}' | ap..." not closed`,
											},
										],
									},
								},
								slug: "notify_st_1",
								type: "http_request",
							},
						],
						workflowId: "welcome",
					},
				],
			},
		});

		const text = textOf(await callTool(await client(), "get_workflows", {}));

		expect(text).toContain("Successfully fetched workflows:");
		expect(text).not.toContain(TOKEN);
		expect(text).toContain("headers.0.value");
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
		// The saved workflow comes back hidden too, in the text and in structuredContent.
		expect(JSON.stringify(result)).not.toContain(TOKEN);
		expect(JSON.stringify(result)).toContain(HIDDEN_SECRET);
	});

	it("a write to another step hides the HTTP request step's secrets in the saved workflow it returns", async () => {
		fakeWorkflowsApi(workflowWithHttpStep());

		const result = await callTool(await client(), "add_workflow_step", {
			step: { controlValues: { body: "Shipped" }, name: "SMS", type: "sms" },
			workflowId: "welcome",
		});

		expect(result.isError).toBeFalsy();
		expect(JSON.stringify(result)).not.toContain(TOKEN);
		expect(JSON.stringify(result)).not.toContain(SLACK_SECRET);
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
