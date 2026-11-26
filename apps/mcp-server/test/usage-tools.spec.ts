import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerUsageTools } from "../src/tools/usage";
import { callTool, connect, connectAllTools, textOf, tokenAccessors } from "./support";

type Json = Record<string, any>;
type Answer = { status?: number; body: unknown };
type Route = (url: URL) => Answer | undefined;

const NOW = new Date("2026-11-25T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;
const WORKFLOW_DB_ID = "64b7f0c2a1b2c3d4e5f60718";
const OTHER_WORKFLOW_DB_ID = "64b7f0c2a1b2c3d4e5f60719";

const SECRETS = ["chart-secret", "jane@acme.com", "workflow-secret", "sk_live_planted"];

/** Stubs fetch with the first route that answers; records every requested URL. */
function fakeApi(...routes: Route[]) {
	const urls: URL[] = [];
	vi.stubGlobal(
		"fetch",
		vi.fn(async (url: string) => {
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
		}),
	);

	return { urls };
}

const isCharts = (url: URL) => url.pathname === "/v1/activity/charts";

const charts =
	(body: unknown, status?: number): Route =>
	(url) =>
		isCharts(url) ? { body, status } : undefined;

const path =
	(pathname: string, body: unknown, status?: number): Route =>
	(url) =>
		url.pathname === pathname ? { body, status } : undefined;

const passwordReset = (pathname = "/v2/workflows/password-reset") =>
	path(pathname, {
		data: {
			_id: WORKFLOW_DB_ID,
			name: "Password reset",
			steps: [{ controlValues: { body: "workflow-secret" } }],
			workflowId: "password-reset",
		},
	});

const welcome = path("/v2/workflows/welcome", {
	data: { _id: OTHER_WORKFLOW_DB_ID, name: "Welcome", workflowId: "welcome" },
});

function day(timestamp: string, counts: Json): Json {
	return { chat: 0, email: 0, inApp: 0, push: 0, sms: 0, timestamp, ...counts };
}

function chartsData(overrides: Json = {}): Json {
	return {
		"active-subscribers": { currentPeriod: 120, previousPeriod: 100 },
		"avg-messages-per-subscriber": { currentPeriod: 2.46, previousPeriod: 2 },
		"delivery-trend": [
			day("2026-11-23", { email: 100, inApp: 40, sms: 10 }),
			day("2026-11-24", { apiKey: "chart-secret", email: 160, inApp: 20, push: 5 }),
			day("2026-11-25", { email: 40 }),
		],
		"interaction-trend": [
			{
				messageArchived: 1,
				messageRead: 3,
				messageSeen: 10,
				messageSnoozed: 0,
				timestamp: "2026-11-23",
			},
			{
				messageArchived: 0,
				messageRead: 2,
				messageSeen: 5,
				messageSnoozed: 1,
				timestamp: "2026-11-24",
			},
		],
		"messages-delivered": { currentPeriod: 335, previousPeriod: 0 },
		"provider-by-volume": [
			{ count: 15, providerId: "twilio" },
			{ count: 260, credentials: { apiKey: "sk_live_planted" }, providerId: "sendgrid" },
			{ count: 60, providerId: "novu" },
		],
		"total-interactions": { currentPeriod: 22, previousPeriod: 44 },
		"workflow-by-volume": [
			{ count: 3, workflowName: "Welcome" },
			{ count: 9, subscriberEmail: "jane@acme.com", workflowName: "Password reset" },
		],
		"workflow-runs-trend": [
			{ completed: 5, error: 1, processing: 2, timestamp: "2026-11-23" },
			{ completed: 4, error: 0, processing: 0, timestamp: "2026-11-24" },
		],
		...overrides,
	};
}

async function client() {
	const server = new McpServer({ name: "usage-test", version: "1.0.0" });
	registerUsageTools(server, tokenAccessors("api-key"));

	return connect(server);
}

function output(result: Awaited<ReturnType<typeof callTool>>): Json {
	expect(result.isError, textOf(result)).toBeFalsy();

	return JSON.parse(textOf(result));
}

describe("get_usage", () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ["Date"] });
		vi.setSystemTime(NOW);
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it("reads the Usage page's charts for the period in one call", async () => {
		const api = fakeApi(charts({ data: chartsData() }));

		await callTool(await client(), "get_usage", { period: "7d" });

		expect(api.urls).toHaveLength(1);
		const [request] = api.urls;
		expect(request.pathname).toBe("/v1/activity/charts");
		expect(request.searchParams.get("createdAtGte")).toBe(
			new Date(NOW.getTime() - 7 * DAY_MS).toISOString(),
		);
		expect(request.searchParams.has("createdAtLte")).toBe(false);
		expect(request.searchParams.getAll("reportType[]").sort()).toEqual([
			"active-subscribers",
			"avg-messages-per-subscriber",
			"delivery-trend",
			"interaction-trend",
			"messages-delivered",
			"provider-by-volume",
			"total-interactions",
			"workflow-by-volume",
			"workflow-runs-trend",
		]);
		expect(request.searchParams.has("workflowIds[]")).toBe(false);
		expect(request.searchParams.has("subscriberIds[]")).toBe(false);
	});

	it("returns the page's numbers, comparing only the metrics with the previous period", async () => {
		fakeApi(charts({ data: chartsData() }));

		const result = output(await callTool(await client(), "get_usage", { period: "7d" }));

		expect(result.period).toEqual({
			from: new Date(NOW.getTime() - 7 * DAY_MS).toISOString(),
			key: "7d",
			label: "Last 7 days",
			to: NOW.toISOString(),
		});
		expect(result.dashboardPath).toBe("/analytics?period=7d");
		expect(result.metrics).toEqual({
			activeSubscribers: { changePercent: 20, current: 120, previous: 100 },
			inboxInteractions: { changePercent: -50, current: 22, previous: 44 },
			messagesDelivered: { changePercent: null, current: 335, previous: 0 },
			messagesPerSubscriber: { changePercent: 23, current: 2.5, previous: 2 },
		});
		expect(result.inboxInteractionsByType).toEqual({
			archived: 1,
			read: 5,
			seen: 15,
			snoozed: 1,
		});
		expect(result.channels[0]).toEqual({
			busiestDay: { date: "2026-11-24", messages: 160 },
			channel: "email",
			messages: 300,
			share: 80,
		});
		expect(result.channels.map((channel: Json) => channel.channel)).toEqual([
			"email",
			"in_app",
			"sms",
			"push",
			"chat",
		]);
		expect(result.channels.find((channel: Json) => channel.channel === "chat")).toEqual({
			channel: "chat",
			messages: 0,
			share: 0,
		});
		expect(result.workflowRuns).toEqual({ error: 1, success: 9, total: 10 });
		expect(result.topWorkflows).toEqual([
			{ name: "Password reset", runs: 9 },
			{ name: "Welcome", runs: 3 },
		]);
		expect(result.topProviders).toEqual([
			{ messages: 260, providerId: "sendgrid" },
			{ messages: 60, providerId: "novu" },
			{ messages: 15, providerId: "twilio" },
		]);
		expect(result.notes).toHaveLength(3);
	});

	it("never returns a field the charts don't define, nor a workflow beyond its ids and name", async () => {
		fakeApi(passwordReset(), charts({ data: chartsData() }));

		for (const args of [{ period: "7d" }, { period: "7d", workflowIds: ["password-reset"] }]) {
			const text = textOf(await callTool(await client(), "get_usage", args));

			for (const secret of SECRETS)
				expect(text, `${JSON.stringify(args)}: ${secret}`).not.toContain(secret);
		}
	});

	it("filters by every workflow's _id, as the page's Workflows filter does, without the run charts it doesn't filter", async () => {
		const api = fakeApi(passwordReset(), welcome, charts({ data: chartsData() }));

		const result = output(
			await callTool(await client(), "get_usage", {
				period: "30d",
				workflowIds: ["password-reset", "welcome"],
			}),
		);

		const [request, ...others] = api.urls.filter(isCharts);
		expect(others).toHaveLength(0);
		expect(request.searchParams.getAll("workflowIds[]")).toEqual([
			WORKFLOW_DB_ID,
			OTHER_WORKFLOW_DB_ID,
		]);
		expect(request.searchParams.getAll("reportType[]")).not.toContain("workflow-by-volume");
		expect(request.searchParams.getAll("reportType[]")).not.toContain("workflow-runs-trend");

		expect(result.workflows).toEqual([
			{ id: WORKFLOW_DB_ID, identifier: "password-reset", name: "Password reset" },
			{ id: OTHER_WORKFLOW_DB_ID, identifier: "welcome", name: "Welcome" },
		]);
		expect(new URLSearchParams(result.dashboardPath.split("?")[1]).get("workflows")).toBe(
			`${WORKFLOW_DB_ID},${OTHER_WORKFLOW_DB_ID}`,
		);
		expect(result).not.toHaveProperty("workflowRuns");
		expect(result).not.toHaveProperty("topWorkflows");
		expect(result.notes.join(" ")).toContain(
			"workflowRuns and topWorkflows are left out when filtered by workflow",
		);
	});

	it("filters by a workflow named twice, by identifier and by _id, once", async () => {
		const api = fakeApi(
			passwordReset(),
			passwordReset(`/v2/workflows/${WORKFLOW_DB_ID}`),
			charts({ data: chartsData() }),
		);

		const result = output(
			await callTool(await client(), "get_usage", {
				workflowIds: ["password-reset", WORKFLOW_DB_ID],
			}),
		);

		expect(api.urls.find(isCharts)!.searchParams.getAll("workflowIds[]")).toEqual([
			WORKFLOW_DB_ID,
		]);
		expect(result.workflows).toHaveLength(1);
		expect(result.dashboardPath).toBe(`/analytics?period=30d&workflows=${WORKFLOW_DB_ID}`);
	});

	it("looks up a database _id too, so an unknown one fails instead of reading as no traffic", async () => {
		const api = fakeApi(
			passwordReset(`/v2/workflows/${WORKFLOW_DB_ID}`),
			charts({ data: chartsData() }),
		);

		const result = output(
			await callTool(await client(), "get_usage", { workflowIds: [WORKFLOW_DB_ID] }),
		);

		expect(api.urls[0].pathname).toBe(`/v2/workflows/${WORKFLOW_DB_ID}`);
		expect(result.workflows).toEqual([
			{ id: WORKFLOW_DB_ID, identifier: "password-reset", name: "Password reset" },
		]);

		fakeApi(path(`/v2/workflows/${"0".repeat(24)}`, { message: "Workflow not found" }, 404));
		const unknown = await callTool(await client(), "get_usage", {
			workflowIds: ["0".repeat(24)],
		});

		expect(unknown.isError).toBe(true);
		expect(textOf(unknown)).toContain(
			"was not found. Pass its trigger identifier or _id; workflows picked in the Usage page's Workflows filter arrive in the page's filters.",
		);
	});

	it("refuses more workflows than the page sends, saying what to pass", async () => {
		const api = fakeApi(charts({ data: chartsData() }));
		const workflowIds = Array.from({ length: 11 }, (_, index) => `workflow-${index}`);

		const result = await callTool(await client(), "get_usage", { workflowIds });

		expect(result.isError).toBe(true);
		expect(textOf(result)).toContain(
			"Pass at most 10 workflowIds, or leave it out for all workflows",
		);
		expect(api.urls).toHaveLength(0);
	});

	it("steps down to a period the plan keeps when none is asked for, and says so", async () => {
		const DAYS_30 = new Date(NOW.getTime() - 30 * DAY_MS).toISOString();
		const DAYS_7 = new Date(NOW.getTime() - 7 * DAY_MS).toISOString();
		const api = fakeApi(
			(url) =>
				isCharts(url) && [DAYS_30, DAYS_7].includes(url.searchParams.get("createdAtGte")!)
					? {
							body: {
								message:
									"Requested date range exceeds your plan's retention period.",
							},
							status: 402,
						}
					: undefined,
			charts({ data: chartsData() }),
		);

		const result = output(await callTool(await client(), "get_usage", {}));

		expect(result.period.key).toBe("24h");
		expect(result.dashboardPath).toBe("/analytics?period=24h");
		expect(result.notes[0]).toBe(
			"No period was asked for, and longer ones are outside the plan's activity retention period, so this is the last 24 hours.",
		);
		expect(api.urls.map((url) => url.searchParams.get("createdAtGte"))).toEqual([
			DAYS_30,
			DAYS_7,
			new Date(NOW.getTime() - DAY_MS).toISOString(),
		]);
	});

	it("doesn't step down from a period the user asked for", async () => {
		const api = fakeApi(
			charts({ message: "Requested date range exceeds your plan's retention period." }, 402),
		);

		const result = await callTool(await client(), "get_usage", { period: "30d" });

		expect(result.isError).toBe(true);
		expect(api.urls).toHaveLength(1);
	});

	it("defaults to the page's 30 days, and treats blank workflowIds as none", async () => {
		const api = fakeApi(charts({ data: chartsData() }));

		const result = output(
			await callTool(await client(), "get_usage", { workflowIds: ["  ", ""] }),
		);

		expect(result.period.key).toBe("30d");
		expect(result).not.toHaveProperty("workflows");
		expect(api.urls).toHaveLength(1);
		expect(api.urls[0].searchParams.has("workflowIds[]")).toBe(false);
	});

	it("names the plan's retention when the period is outside it", async () => {
		fakeApi(
			charts(
				{
					message: "Requested date range exceeds your plan's retention period.",
					statusCode: 402,
				},
				402,
			),
		);

		const result = await callTool(await client(), "get_usage", { period: "90d" });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: expect.objectContaining({ status: 402 }),
		});
		expect(textOf(result)).toContain(
			"Last 90 days is outside your plan's activity retention period.",
		);
		expect(textOf(result)).toContain("Ask for a shorter period.");
	});

	it("fails with the status when the charts can't be read, never with empty numbers", async () => {
		fakeApi(charts({ message: "Forbidden resource", statusCode: 403 }, 403));

		const result = await callTool(await client(), "get_usage", { period: "7d" });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: expect.objectContaining({ status: 403 }),
		});
		expect(textOf(result)).toBe(
			"Error: Failed to read usage. Status: 403, Message: Forbidden resource",
		);
	});

	it("fails with a 404 when a workflow doesn't exist", async () => {
		fakeApi(
			passwordReset(),
			path("/v2/workflows/nope", { message: "Workflow not found" }, 404),
		);

		const result = await callTool(await client(), "get_usage", {
			workflowIds: ["password-reset", "nope"],
		});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			error: expect.objectContaining({ status: 404 }),
		});
		expect(textOf(result)).toContain('Workflow "nope" was not found');
	});

	it("is advertised as read-only, with a title", async () => {
		const { tools } = await (await client()).listTools();
		const tool = tools.find((candidate) => candidate.name === "get_usage")!;

		expect(tool.title).toBe("Get usage");
		expect(tool.annotations).toEqual({
			destructiveHint: false,
			openWorldHint: false,
			readOnlyHint: true,
		});
		expect(Object.keys(tool.inputSchema.properties ?? {}).sort()).toEqual([
			"environmentId",
			"idempotencyKey",
			"period",
			"workflowIds",
		]);
	});

	it("isn't on the hosted server, whose API keys and OAuth the charts route refuses", async () => {
		const hosted = await connectAllTools(tokenAccessors("api-key"), "us");
		const { tools } = await hosted.listTools();

		expect(tools.map((tool) => tool.name)).not.toContain("get_usage");
	});
});
