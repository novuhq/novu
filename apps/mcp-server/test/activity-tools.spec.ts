import { afterEach, describe, expect, it, vi } from "vitest";
import { API_URL, callTool, connectAllTools, textOf, tokenAccessors } from "./support";

type Json = Record<string, any>;
type Route = (url: URL) => { status?: number; body: unknown } | undefined;

const WORKFLOW_DB_ID = "64b7f0c2a1b2c3d4e5f60718";

/** Stubs fetch with the first route that answers; records every requested URL. */
function fakeApi(...routes: Route[]) {
	const urls: URL[] = [];
	const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
		const parsed = new URL(url);
		urls.push(parsed);
		const answer = routes.map((route) => route(parsed)).find(Boolean) ?? {
			body: { message: `unexpected ${parsed.pathname}` },
			status: 500,
		};

		return new Response(JSON.stringify(answer.body), {
			headers: { "Content-Type": "application/json" },
			status: answer.status ?? 200,
		});
	});
	vi.stubGlobal("fetch", fetchMock);

	return { fetchMock, urls };
}

const path =
	(pathname: string, body: unknown, status?: number): Route =>
	(url) =>
		url.pathname === pathname ? { body, status } : undefined;

function run(overrides: Json = {}): Json {
	return {
		createdAt: "2026-11-20T10:00:00.000Z",
		deliveryLifecycleDetail: "preference",
		deliveryLifecycleStatus: "skipped",
		environmentId: "env-1",
		id: "run-1",
		internalSubscriberId: "internal-1",
		organizationId: "org-1",
		payload: { resetUrl: "https://example.com/secret-link" },
		status: "completed",
		steps: [
			{
				id: "s1",
				providerId: "sendgrid",
				status: "skipped",
				stepId: "email-step",
				stepRunId: "sr1",
				stepType: "email",
			},
		],
		subscriberId: "user_123",
		transactionId: "txn-1",
		triggerIdentifier: "password-reset",
		workflowId: WORKFLOW_DB_ID,
		workflowName: "Password reset",
		...overrides,
	};
}

function requestRow(overrides: Json = {}): Json {
	return {
		createdAt: "2026-11-20T10:00:00.000Z",
		id: "req-1",
		requestBody: JSON.stringify({
			name: "password-reset",
			payload: { secret: "s3cr3t" },
			to: "user_123",
		}),
		responseBody: JSON.stringify({
			data: { acknowledged: true, status: "processed", transactionId: "txn-1" },
		}),
		statusCode: 201,
		transactionId: "txn-1",
		urlPattern: "/v1/events/trigger",
		...overrides,
	};
}

async function client() {
	return connectAllTools(tokenAccessors("api-key"));
}

function output(result: Awaited<ReturnType<typeof callTool>>): Json {
	expect(result.isError, textOf(result)).toBeFalsy();

	return JSON.parse(textOf(result));
}

describe("activity tools", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("are advertised as read-only, with a title", async () => {
		const { tools } = await (await client()).listTools();

		for (const name of ["get_workflow_runs", "get_workflow_run", "get_trigger_requests"]) {
			const tool = tools.find((candidate) => candidate.name === name)!;
			expect(tool.title, name).toBeTruthy();
			expect(tool.annotations, name).toEqual({
				destructiveHint: false,
				openWorldHint: false,
				readOnlyHint: true,
			});
		}
	});
});

describe("get_workflow_runs", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("resolves a trigger identifier to the workflow _id and echoes the resolved filters", async () => {
		const api = fakeApi(
			path("/v2/workflows/password-reset", {
				data: { _id: WORKFLOW_DB_ID, name: "Password reset", workflowId: "password-reset" },
			}),
			path("/v1/activity/workflow-runs", { data: [run()], next: "cursor-2", previous: null }),
		);

		const result = output(
			await callTool(await client(), "get_workflow_runs", {
				createdAfter: "2026-11-01",
				statuses: ["completed", "error"],
				subscriberId: "user_123",
				workflowId: "password-reset",
			}),
		);

		const query = api.urls[1].searchParams;
		expect(query.getAll("workflowIds")).toEqual([WORKFLOW_DB_ID]);
		expect(query.getAll("subscriberIds")).toEqual(["user_123"]);
		expect(query.getAll("statuses")).toEqual(["completed", "error"]);
		expect(query.get("createdGte")).toBe("2026-11-01");
		expect(query.get("limit")).toBe("10");
		expect(result).toEqual({
			dashboardPath: expect.stringMatching(/^\/activity\/workflow-runs\?/),
			filters: {
				createdAfter: "2026-11-01",
				statuses: ["completed", "error"],
				subscriberId: "user_123",
				workflowId: WORKFLOW_DB_ID,
				workflowIdentifier: "password-reset",
			},
			next: "cursor-2",
			runs: [
				{
					createdAt: "2026-11-20T10:00:00.000Z",
					dashboardPath: "/activity/workflow-runs?activityItemId=run-1",
					deliveryLifecycleDetail: "preference",
					deliveryLifecycleStatus: "skipped",
					id: "run-1",
					status: "completed",
					steps: [{ status: "skipped", stepId: "email-step", stepType: "email" }],
					subscriberId: "user_123",
					transactionId: "txn-1",
					workflowIdentifier: "password-reset",
					workflowName: "Password reset",
				},
			],
		});
	});

	it("links to the runs page with the workflow _id, never the trigger identifier", async () => {
		fakeApi(
			path("/v2/workflows/password-reset", {
				data: { _id: WORKFLOW_DB_ID, workflowId: "password-reset" },
			}),
			path("/v1/activity/workflow-runs", { data: [], next: null }),
		);

		const result = output(
			await callTool(await client(), "get_workflow_runs", {
				channels: ["email", "sms"],
				createdAfter: "2026-11-23",
				createdBefore: "2026-11-23T23:59:59.999Z",
				statuses: ["error"],
				subscriberId: "user_123",
				workflowId: "password-reset",
			}),
		);

		const link = new URL(result.dashboardPath, "https://dashboard.test");
		expect(link.pathname).toBe("/activity/workflow-runs");
		expect(Object.fromEntries(link.searchParams)).toEqual({
			after: "2026-11-23T00:00:00.000Z",
			before: "2026-11-23T23:59:59.999Z",
			channels: "email,sms",
			dateRange: "custom",
			subscriberId: "user_123",
			workflows: WORKFLOW_DB_ID,
		});
	});

	it("filters and links by severity, context and subscription, as the page does", async () => {
		const api = fakeApi(path("/v1/activity/workflow-runs", { data: [], next: null }));

		const result = output(
			await callTool(await client(), "get_workflow_runs", {
				contextKeys: ["tenant:acme", "region:eu"],
				severity: ["high", "none"],
				subscriptionId: "sub_1",
			}),
		);

		const query = api.urls[0].searchParams;
		expect(query.getAll("contextKeys")).toEqual(["tenant:acme", "region:eu"]);
		expect(query.getAll("severity")).toEqual(["high", "none"]);
		expect(query.get("subscriptionId")).toBe("sub_1");
		expect(result.filters).toEqual({
			contextKeys: ["tenant:acme", "region:eu"],
			severity: ["high", "none"],
			subscriptionId: "sub_1",
		});

		const link = new URL(result.dashboardPath, "https://dashboard.test");
		expect(link.searchParams.getAll("contextKeys")).toEqual(["tenant:acme", "region:eu"]);
		expect(link.searchParams.get("severity")).toBe("high,none");
		expect(link.searchParams.get("subscriptionId")).toBe("sub_1");
	});

	it("filters and links runs without a context, and runs with a tool step", async () => {
		const api = fakeApi(path("/v1/activity/workflow-runs", { data: [], next: null }));

		const result = output(
			await callTool(await client(), "get_workflow_runs", {
				channels: ["tool"],
				contextKeys: [""],
			}),
		);

		expect(api.urls[0].search).toContain("contextKeys=");
		expect(api.urls[0].searchParams.getAll("contextKeys")).toEqual([""]);
		expect(api.urls[0].searchParams.getAll("channels")).toEqual(["tool"]);
		expect(
			new URL(result.dashboardPath, "https://dashboard.test").searchParams.getAll(
				"contextKeys",
			),
		).toEqual([""]);
	});

	it("uses a database _id as is, so runs of a deleted workflow stay reachable", async () => {
		const api = fakeApi(path("/v1/activity/workflow-runs", { data: [run()], next: null }));

		await callTool(await client(), "get_workflow_runs", { workflowId: WORKFLOW_DB_ID });

		expect(api.urls).toHaveLength(1);
		expect(api.urls[0].searchParams.getAll("workflowIds")).toEqual([WORKFLOW_DB_ID]);
	});

	it("says explicitly that no runs matched, and where to look next", async () => {
		fakeApi(path("/v1/activity/workflow-runs", { data: [], next: null, previous: null }));

		const result = output(
			await callTool(await client(), "get_workflow_runs", { subscriberId: "user_123" }),
		);

		expect(result.runs).toEqual([]);
		expect(result.note).toBe(
			"No workflow runs matched these filters within your plan's activity retention window. If the trigger may have been rejected, check get_trigger_requests.",
		);
	});

	it("reports an unknown trigger identifier instead of an empty list", async () => {
		const api = fakeApi(
			path("/v2/workflows/missing", { message: "Workflow cannot be found" }, 404),
		);

		const result = await callTool(await client(), "get_workflow_runs", {
			workflowId: "missing",
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: { message: expect.stringContaining("get_workflows"), status: 404 },
		});
		expect(api.urls).toHaveLength(1);
	});

	it("explains a date range outside the plan's retention and what to send instead", async () => {
		fakeApi(
			path(
				"/v1/activity/workflow-runs",
				{
					message:
						"Requested date range exceeds your plan's retention period. The earliest accessible date for your plan is 2026-10-23. Please upgrade your plan to access older activities.",
					statusCode: 402,
				},
				402,
			),
		);

		const result = await callTool(await client(), "get_workflow_runs", {
			createdAfter: "2025-01-01",
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent?.error).toMatchObject({ status: 402 });
		expect(textOf(result)).toContain("2026-10-23");
		expect(textOf(result)).toContain("Send a later createdAfter");
	});

	it("rejects a date that is not ISO 8601 before calling the API", async () => {
		const api = fakeApi();

		const result = await callTool(await client(), "get_workflow_runs", {
			createdAfter: "last tuesday",
		});

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain("Expected an ISO 8601 date");
		expect(textOf(result)).toContain("at createdAfter");
		expect(api.urls).toHaveLength(0);
	});
});

describe("get_workflow_run", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	const providerError = JSON.stringify({
		config: {
			headers: { Authorization: "Bearer SG.live-key" },
			url: "https://api.sendgrid.com",
		},
		message: "Request failed with status code 401",
		name: "AxiosError",
		request: { _header: "POST /v3/mail/send" },
		response: {
			data: { errors: [{ message: "The provided authorization grant is invalid" }] },
			headers: { "x-request-id": "abc" },
			status: 401,
		},
	});

	const failedRun = run({
		deliveryLifecycleDetail: undefined,
		deliveryLifecycleStatus: "errored",
		steps: [
			{
				createdAt: "2026-11-20T10:00:00.000Z",
				errorCode: "send_message_failed",
				errorMessage: "provider_error",
				executionDetails: [
					{
						_id: "e1",
						createdAt: "2026-11-20T10:00:01.000Z",
						detail: "Step queued",
						raw: null,
						status: "Pending",
					},
					{
						_id: "e2",
						createdAt: "2026-11-20T10:00:02.000Z",
						detail: "Unexpected provider error",
						raw: providerError,
						status: "Failed",
					},
					{
						_id: "e3",
						createdAt: "2026-11-20T10:00:03.000Z",
						detail: "Not JSON",
						raw: "apiKey=SG.live-key",
						status: "Failed",
					},
				],
				providerId: "sendgrid",
				status: "failed",
				stepId: "email-step",
				stepRunId: "sr1",
				stepType: "email",
			},
		],
	});

	it("reads a provider response only from failed and warning details, never the stored message", async () => {
		fakeApi(
			path("/v1/activity/workflow-runs/run-1", {
				data: run({
					steps: [
						{
							createdAt: "2026-11-20T10:00:00.000Z",
							executionDetails: [
								{
									_id: "e1",
									createdAt: "2026-11-20T10:00:01.000Z",
									detail: "Message created",
									raw: JSON.stringify({ message: "Your reset code is 123456" }),
									status: "Success",
								},
							],
							status: "completed",
							stepId: "sms-step",
							stepType: "sms",
						},
					],
				}),
			}),
			path("/v1/activity/requests", { data: [], total: 0 }),
		);

		const result = output(
			await callTool(await client(), "get_workflow_run", { workflowRunId: "run-1" }),
		);

		expect(result.steps[0].executionDetails).toEqual([
			{ createdAt: "2026-11-20T10:00:01.000Z", detail: "Message created", status: "Success" },
		]);
		expect(JSON.stringify(result)).not.toContain("123456");
	});

	it("returns step errors, trimmed execution details and the trigger request", async () => {
		const api = fakeApi(
			path("/v1/activity/workflow-runs/run-1", { data: failedRun }),
			path("/v1/activity/requests", {
				// The API matches transactionId as a substring: txn-10 is another trigger.
				data: [requestRow({ id: "req-10", transactionId: "txn-10" }), requestRow()],
				page: 0,
				pageSize: 50,
				total: 2,
			}),
		);

		const result = output(
			await callTool(await client(), "get_workflow_run", { workflowRunId: "run-1" }),
		);

		expect(api.urls[1].searchParams.get("transactionId")).toBe("txn-1");
		expect(api.urls[1].searchParams.get("limit")).toBe("50");
		expect(result.run).toEqual({
			createdAt: "2026-11-20T10:00:00.000Z",
			dashboardPath: "/activity/workflow-runs?activityItemId=run-1",
			deliveryLifecycleStatus: "errored",
			id: "run-1",
			status: "completed",
			subscriberId: "user_123",
			transactionId: "txn-1",
			workflowId: WORKFLOW_DB_ID,
			workflowIdentifier: "password-reset",
			workflowName: "Password reset",
		});
		expect(result.steps[0]).toMatchObject({
			errorCode: "send_message_failed",
			errorMessage: "provider_error",
			providerId: "sendgrid",
			status: "failed",
		});
		expect(result.steps[0].executionDetails).toEqual([
			{ createdAt: "2026-11-20T10:00:01.000Z", detail: "Step queued", status: "Pending" },
			{
				createdAt: "2026-11-20T10:00:02.000Z",
				detail: "Unexpected provider error",
				providerResponse: {
					message: "Request failed with status code 401",
					name: "AxiosError",
					response: {
						data: {
							errors: [{ message: "The provided authorization grant is invalid" }],
						},
						status: 401,
					},
				},
				status: "Failed",
			},
			{ createdAt: "2026-11-20T10:00:03.000Z", detail: "Not JSON", status: "Failed" },
		]);
		expect(result.triggerRequests).toEqual([
			{
				createdAt: "2026-11-20T10:00:00.000Z",
				dashboardPath: "/activity/requests?transactionId=txn-1&selectedLogId=req-1",
				id: "req-1",
				statusCode: 201,
				urlPattern: "/v1/events/trigger",
			},
		]);
		const text = JSON.stringify(result);
		for (const secret of ["SG.live-key", "x-request-id", "_header", "secret-link", "s3cr3t"]) {
			expect(text, secret).not.toContain(secret);
		}
	});

	it("keeps failures when a step has more execution details than the cap", async () => {
		const details = Array.from({ length: 15 }, (_, index) => ({
			_id: `e${index}`,
			createdAt: `2026-11-20T10:00:${String(index).padStart(2, "0")}.000Z`,
			detail: index === 0 ? "Provider rejected" : `Detail ${index}`,
			raw: null,
			status: index === 0 ? "Failed" : "Success",
		}));
		fakeApi(
			path("/v1/activity/workflow-runs/run-1", {
				data: run({
					steps: [
						{
							executionDetails: details,
							status: "failed",
							stepId: "email-step",
							stepType: "email",
						},
					],
				}),
			}),
			path("/v1/activity/requests", { data: [], total: 0 }),
		);

		const result = output(
			await callTool(await client(), "get_workflow_run", { workflowRunId: "run-1" }),
		);

		const kept = result.steps[0].executionDetails;
		expect(kept).toHaveLength(10);
		expect(kept[0].detail).toBe("Provider rejected");
		expect(kept.at(-1).detail).toBe("Detail 14");
		expect(result.steps[0].executionDetailsOmitted).toBe(5);
	});

	it("redacts credentials, the query and secret-looking path parts of URLs in provider messages", async () => {
		fakeApi(
			path("/v1/activity/workflow-runs/run-1", {
				data: run({
					steps: [
						{
							executionDetails: [
								{
									_id: "e1",
									createdAt: "2026-11-20T10:00:01.000Z",
									detail: "HTTP request returned a non-object response",
									raw: JSON.stringify({
										message:
											"Expected an object from https://user:pw@api.example.com/hooks/T0123456789ABCDEFG/handle?token=short-secret-123",
									}),
									status: "Warning",
								},
							],
							status: "completed",
							stepId: "http-step",
							stepType: "http_request",
						},
					],
				}),
			}),
			path("/v1/activity/requests", { data: [], total: 0 }),
		);

		const result = output(
			await callTool(await client(), "get_workflow_run", { workflowRunId: "run-1" }),
		);

		expect(result.steps[0].executionDetails[0].providerResponse).toEqual({
			message:
				"Expected an object from https://api.example.com/hooks/[redacted]/handle?[redacted]",
		});
		for (const secret of ["short-secret-123", "user:pw", "T0123456789ABCDEFG"]) {
			expect(JSON.stringify(result), secret).not.toContain(secret);
		}
	});

	it("says the trigger request lookup failed instead of failing the tool", async () => {
		fakeApi(
			path("/v1/activity/workflow-runs/run-1", { data: run() }),
			path("/v1/activity/requests", { message: "Internal server error" }, 500),
		);

		const result = output(
			await callTool(await client(), "get_workflow_run", { workflowRunId: "run-1" }),
		);

		expect(result.run.id).toBe("run-1");
		expect(result.triggerRequests).toBeUndefined();
		expect(result.triggerRequestsError).toBe(
			"Could not look up the trigger request (status 500): Internal server error",
		);
	});

	it("returns a missing run as an error with its status", async () => {
		fakeApi(
			path("/v1/activity/workflow-runs/nope", { message: "Workflow run not found" }, 404),
		);

		const result = await callTool(await client(), "get_workflow_run", {
			workflowRunId: "nope",
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent?.error).toMatchObject({ status: 404 });
		expect(textOf(result)).toContain("Workflow run not found");
	});
});

describe("get_trigger_requests", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("lists the trigger routes without bodies, with the trigger outcome", async () => {
		const api = fakeApi(
			path("/v1/activity/requests", {
				data: [
					requestRow(),
					requestRow({
						id: "req-2",
						responseBody: JSON.stringify({
							data: {
								acknowledged: true,
								error: ["Workflow is not active"],
								status: "trigger_not_active",
							},
						}),
					}),
					requestRow({
						id: "req-3",
						responseBody: JSON.stringify({
							message: ["to must be defined"],
							statusCode: 422,
						}),
						statusCode: 422,
					}),
				],
				total: 3,
			}),
		);

		const result = output(
			await callTool(await client(), "get_trigger_requests", {
				createdAfter: "2026-11-20T00:00:00Z",
			}),
		);

		const query = api.urls[0].searchParams;
		expect(query.get("source")).toBe("http");
		expect(query.get("urlPattern")).toBeNull();
		expect(query.get("createdGte")).toBe(String(Date.parse("2026-11-20T00:00:00Z")));
		expect(query.get("limit")).toBe("20");
		expect(result.dashboardPath).toBe(
			`/activity/requests?createdGte=${Date.parse("2026-11-20T00:00:00Z")}`,
		);
		expect(result.requests).toEqual([
			{
				createdAt: "2026-11-20T10:00:00.000Z",
				dashboardPath: "/activity/requests?transactionId=txn-1&selectedLogId=req-1",
				id: "req-1",
				statusCode: 201,
				transactionId: "txn-1",
				triggerStatus: "processed",
				urlPattern: "/v1/events/trigger",
				workflow: "password-reset",
			},
			expect.objectContaining({
				error: "Workflow is not active",
				id: "req-2",
				triggerStatus: "trigger_not_active",
			}),
			expect.objectContaining({ error: "to must be defined", id: "req-3", statusCode: 422 }),
		]);
		expect(JSON.stringify(result)).not.toContain("s3cr3t");
		expect(result).toMatchObject({ scanLimitReached: false, scanned: 3, total: 3 });
	});

	it("matches workflow and subscriber in single, object, array and bulk bodies", async () => {
		const body = (value: Json) => ({ requestBody: JSON.stringify(value) });
		fakeApi(
			path("/v1/activity/requests", {
				data: [
					requestRow({
						id: "string-to",
						...body({ name: "password-reset", to: "user_123" }),
					}),
					requestRow({
						id: "object-to",
						...body({ name: "password-reset", to: { subscriberId: "user_123" } }),
					}),
					requestRow({
						id: "array-to",
						...body({
							name: "password-reset",
							to: ["other", { subscriberId: "user_123" }],
						}),
					}),
					requestRow({
						id: "bulk",
						urlPattern: "/v1/events/trigger/bulk",
						...body({
							events: [
								{ name: "welcome", to: "user_123" },
								{ name: "password-reset", to: "user_123" },
							],
						}),
					}),
					requestRow({
						id: "other-subscriber",
						...body({ name: "password-reset", to: "user_999" }),
					}),
					requestRow({
						id: "other-workflow",
						...body({ name: "welcome", to: "user_123" }),
					}),
					requestRow({
						id: "broadcast",
						urlPattern: "/v1/events/trigger/broadcast",
						...body({ name: "password-reset" }),
					}),
					requestRow({
						id: "truncated",
						requestBody: `{"name":"password-reset","to":"user_123","payload":{"big":"${"x".repeat(20)}...`,
					}),
				],
				total: 8,
			}),
		);

		const result = output(
			await callTool(await client(), "get_trigger_requests", {
				subscriberId: "user_123",
				workflowId: "password-reset",
			}),
		);

		expect(result.requests.map((request: Json) => request.id)).toEqual([
			"string-to",
			"object-to",
			"array-to",
			"bulk",
		]);
		expect(result.requests[3].workflow).toBe("welcome, password-reset");
		// A truncated body could pair values from different events, so it is counted, not matched.
		expect(result.truncatedBodiesNotChecked).toBe(1);
		expect(result.note).toContain("1 request bodies were too large to store whole");
	});

	it("gets one request by id, with its traces and without its bodies", async () => {
		const api = fakeApi(
			path("/v1/activity/requests/req-1", {
				data: {
					request: requestRow(),
					traces: [
						{
							createdAt: "2026-11-20T10:00:00.100Z",
							entityId: "req-1",
							eventType: "request_invalid_recipients",
							externalSubscriberId: "user_123",
							message:
								"Subscriber has no email, see https://hooks.example.com/x?token=s3cr3t",
							rawData: '{"secret":"s3cr3t"}',
							status: "error",
							title: "Invalid recipients",
						},
					],
				},
			}),
		);

		const result = output(
			await callTool(await client(), "get_trigger_requests", {
				requestId: "req-1",
				statusCodes: [500],
			}),
		);

		expect(api.urls).toHaveLength(1);
		expect(result.request).toMatchObject({
			id: "req-1",
			statusCode: 201,
			workflow: "password-reset",
		});
		expect(result.traces).toEqual([
			{
				createdAt: "2026-11-20T10:00:00.100Z",
				eventType: "request_invalid_recipients",
				message: "Subscriber has no email, see https://hooks.example.com/x?[redacted]",
				status: "error",
				subscriberId: "user_123",
				title: "Invalid recipients",
			},
		]);
		expect(JSON.stringify(result)).not.toContain("s3cr3t");
	});

	it("leaves out the trigger context a failed context lookup appends to its error", async () => {
		const contextError =
			'Failed to resolve context: not found | Context: {"tenant":{"id":"acme","data":{"email":"jane@acme.test"}}}';
		fakeApi(
			path("/v1/activity/requests/req-1", {
				data: {
					request: requestRow({
						responseBody: JSON.stringify({ message: contextError, statusCode: 400 }),
						statusCode: 400,
					}),
					traces: [
						{
							createdAt: "2026-11-20T10:00:00.100Z",
							entityId: "req-1",
							eventType: "workflow_execution_failed",
							message: contextError,
							status: "error",
							title: "Workflow execution failed",
						},
					],
				},
			}),
		);

		const result = output(
			await callTool(await client(), "get_trigger_requests", { requestId: "req-1" }),
		);

		expect(result.request.error).toBe("Failed to resolve context: not found");
		expect(result.traces[0].message).toBe("Failed to resolve context: not found");
		expect(JSON.stringify(result)).not.toContain("jane@acme.test");
	});

	it("scans at most 500 requests and reports when the cap was hit", async () => {
		const api = fakeApi((url) =>
			url.pathname === "/v1/activity/requests"
				? {
						body: {
							data: Array.from({ length: 100 }, (_, index) =>
								requestRow({ id: `req-${url.searchParams.get("page")}-${index}` }),
							),
							total: 2000,
						},
					}
				: undefined,
		);

		const result = output(
			await callTool(await client(), "get_trigger_requests", {
				workflowId: "never-triggered",
			}),
		);

		expect(api.urls.map((url) => url.searchParams.get("page"))).toEqual([
			"0",
			"1",
			"2",
			"3",
			"4",
		]);
		expect(api.urls.every((url) => url.searchParams.get("limit") === "100")).toBe(true);
		expect(result).toMatchObject({
			requests: [],
			scanLimitReached: true,
			scanned: 500,
			total: 2000,
		});
		expect(result.note).toContain("Narrow createdAfter");
	});

	it("returns a failed page as an error, not an empty list", async () => {
		fakeApi(path("/v1/activity/requests", { message: "Forbidden" }, 403));

		const result = await callTool(await client(), "get_trigger_requests", {});

		expect(result.isError).toBe(true);
		expect(result.structuredContent?.error).toMatchObject({ status: 403 });
	});
});

describe("activity tools for the Copilot", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("send the caller's Authorization and advertise no environmentId", async () => {
		const api = fakeApi(path("/v1/activity/workflow-runs", { data: [], next: null }));
		const copilot = await connectAllTools({
			getApiUrl: () => API_URL,
			getAuthorization: () => "Internal jwt",
			getToken: () => null,
		});

		const { tools } = await copilot.listTools();
		await callTool(copilot, "get_workflow_runs", {});

		const runsTool = tools.find((tool) => tool.name === "get_workflow_runs")!;
		expect(runsTool.inputSchema.properties).not.toHaveProperty("environmentId");
		expect(new Headers(api.fetchMock.mock.calls[0][1]?.headers).get("Authorization")).toBe(
			"Internal jwt",
		);
	});
});
