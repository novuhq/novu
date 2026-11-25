import { afterEach, describe, expect, it, vi } from "vitest";
import type { SubscriberReachabilityResult } from "../src/utils/reachability-model";
import { type Routes, respond, stubApi } from "./fake-api";
import { rawSubscriber } from "./fixtures/subscriber";
import { API_URL, callTool, connectAllTools, textOf, tokenAccessors } from "./support";

type FoundReachability = Extract<SubscriberReachabilityResult, { status: "found" }>;

const SECRETS = [
	"fcm-token-secret-1",
	"fcm-token-secret-2",
	"hooks.slack.com",
	"xoxb-connection-secret",
	"+15550001234",
	"5550001234",
	"integration-secret",
	"enterprise-secret-data",
];

function rawIntegration(channel: string, providerId: string, extra: Record<string, unknown> = {}) {
	return {
		_environmentId: "env-1",
		active: true,
		channel,
		credentials: { apiKey: "integration-secret" },
		identifier: `${providerId}-1`,
		primary: channel === "email" || channel === "sms",
		providerId,
		...extra,
	};
}

function search(field: string, value: string) {
	return `/v2/subscribers?${new URLSearchParams({ [field]: value, limit: "10" }).toString()}`;
}

function setupRoutes(overrides: Routes = {}): Routes {
	return {
		"/v1/channel-connections/slack-conn": {
			auth: { accessToken: "xoxb-connection-secret" },
			identifier: "slack-conn",
			workspace: { id: "T1" },
		},
		"/v1/channel-endpoints": [
			{
				channel: "chat",
				connectionIdentifier: "slack-conn",
				contextKeys: [],
				endpoint: { userId: "U123" },
				identifier: "ep-1",
				integrationIdentifier: "slack-1",
				providerId: "slack",
				type: "slack_user",
			},
		],
		"/v1/integrations": [
			rawIntegration("email", "sendgrid"),
			rawIntegration("sms", "twilio"),
			rawIntegration("in_app", "novu"),
			rawIntegration("push", "fcm"),
			rawIntegration("chat", "slack"),
			rawIntegration("sms", "sns", { _environmentId: "env-production", primary: true }),
		],
		"/v2/subscribers/sub_8f21": rawSubscriber(),
		"/v2/subscribers/sub_8f21/preferences": {
			global: { channels: { email: true, sms: true }, enabled: true },
			workflows: [],
		},
		"/v2/subscribers/sub_8f21/preferences?criticality=critical": { global: {}, workflows: [] },
		...overrides,
	};
}

async function checkReachability(args: Record<string, unknown>) {
	const client = await connectAllTools(tokenAccessors("api-key"));
	const result = await callTool(client, "get_subscriber_reachability", args);

	return {
		reachability: (result.structuredContent as { reachability: FoundReachability } | undefined)
			?.reachability,
		result,
	};
}

describe("get_subscriber_reachability", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reads the subscriber, integrations, preferences, endpoints and connections", async () => {
		const fetchMock = stubApi(setupRoutes());

		const { reachability } = await checkReachability({ subscriberId: "sub_8f21" });

		const paths = fetchMock.mock.calls.map(([url]) => String(url).replace(API_URL, ""));
		expect(paths).toEqual([
			"/v2/subscribers/sub_8f21",
			"/v1/integrations",
			"/v2/subscribers/sub_8f21/preferences",
			"/v2/subscribers/sub_8f21/preferences?criticality=critical",
			"/v1/channel-endpoints?limit=100&subscriberId=sub_8f21",
			"/v1/channel-connections/slack-conn",
		]);
		expect(reachability?.status).toBe("found");
		expect(reachability?.environmentId).toBe("env-1");
		expect(reachability?.dashboardPath).toBe("/subscribers/sub_8f21");
		expect(reachability?.channels.map(({ channel, state }) => [channel, state])).toEqual([
			["email", "reachable"],
			["in_app", "reachable"],
			["sms", "reachable"],
			["push", "reachable"],
			["chat", "reachable"],
		]);
	});

	it("reads each connection's context and tracks failed reads per connection", async () => {
		const slackEndpoint = (identifier: string, connectionIdentifier: string) => ({
			channel: "chat",
			connectionIdentifier,
			contextKeys: [],
			identifier,
			integrationIdentifier: "slack-1",
			providerId: "slack",
			type: "slack_channel",
		});
		stubApi(
			setupRoutes({
				"/v1/channel-connections/acme-conn": {
					contextKeys: ["tenant:acme"],
					identifier: "acme-conn",
					workspace: { id: "T1" },
				},
				"/v1/channel-connections/broken-conn": respond(500, { message: "boom" }),
				"/v1/channel-connections/deleted-conn": respond(404, { message: "gone" }),
				"/v1/channel-endpoints": [
					slackEndpoint("ep-acme", "acme-conn"),
					slackEndpoint("ep-deleted", "deleted-conn"),
					slackEndpoint("ep-broken", "broken-conn"),
				],
			}),
		);

		const { reachability } = await checkReachability({ subscriberId: "sub_8f21" });

		// The legacy Slack webhook still reaches the subscriber, so each endpoint's finding is listed.
		expect(reachability?.channels.find((verdict) => verdict.channel === "chat")).toMatchObject({
			details: ["slack webhook", "Couldn't check channel connections (500)"],
			reasons: [
				"Slack endpoint's connection only applies to triggers with context tenant:acme",
				"Slack endpoint has no connection",
			],
			state: "partly",
		});
		expect(reachability?.checked).not.toContain("channel connections");
	});

	it("never returns credentials, custom data or the phone number", async () => {
		stubApi(setupRoutes());

		const { result } = await checkReachability({ subscriberId: "sub_8f21" });

		const output = `${textOf(result)}\n${JSON.stringify(result.structuredContent)}`;
		for (const secret of SECRETS) {
			expect(output).not.toContain(secret);
		}
	});

	it("says when no subscriber matches", async () => {
		stubApi(
			setupRoutes({
				"/v2/subscribers/missing": respond(404, { message: "not found" }),
			}),
		);

		const { reachability } = await checkReachability({ subscriberId: "missing" });

		expect(reachability).toEqual({
			searched: { field: "subscriberId", value: "missing" },
			status: "not_found",
		});
	});

	it("leaves the searched phone number out of a not-found result", async () => {
		stubApi(
			setupRoutes({
				[search("phone", "+1 (555) 000-1234")]: [],
				[search("phone", "+15550001234")]: [],
			}),
		);

		const { result, reachability } = await checkReachability({ phone: "+1 (555) 000-1234" });

		expect(reachability).toEqual({ searched: { field: "phone" }, status: "not_found" });
		expect(textOf(result)).not.toContain("555");
	});

	it("returns candidates when several subscribers match", async () => {
		stubApi(
			setupRoutes({
				[search("name", "Jane")]: [
					rawSubscriber(),
					rawSubscriber({
						email: "jane.doe@acme.com",
						lastName: "Doe",
						subscriberId: "sub_1c09",
					}),
				],
			}),
		);

		const { reachability } = await checkReachability({ name: "Jane" });

		expect(reachability).toEqual({
			candidates: [
				{
					dashboardPath: "/subscribers/sub_8f21",
					email: "jane@acme.com",
					name: "Jane Alvarez",
					subscriberId: "sub_8f21",
				},
				{
					dashboardPath: "/subscribers/sub_1c09",
					email: "jane.doe@acme.com",
					name: "Jane Doe",
					subscriberId: "sub_1c09",
				},
			],
			hasMore: false,
			status: "ambiguous",
		});
	});

	it("says when more subscribers may match than the candidates listed", async () => {
		const page = (count: number, next: string | null) =>
			respond(200, {
				data: Array.from({ length: count }, (_, index) =>
					rawSubscriber({ subscriberId: `sub_${index}` }),
				),
				next,
			});

		stubApi(setupRoutes({ [search("name", "Jane")]: page(2, "cursor-2") }));
		expect((await checkReachability({ name: "Jane" })).reachability).toMatchObject({
			hasMore: true,
			status: "ambiguous",
		});

		stubApi(setupRoutes({ [search("name", "Jane")]: page(10, null) }));
		expect((await checkReachability({ name: "Jane" })).reachability).toMatchObject({
			hasMore: true,
			status: "ambiguous",
		});
	});

	it("is advertised as read-only, with a title", async () => {
		const client = await connectAllTools(tokenAccessors("api-key"));
		const { tools } = await client.listTools();
		const tool = tools.find((candidate) => candidate.name === "get_subscriber_reachability");

		expect(tool?.title).toBe("Get subscriber reachability");
		expect(tool?.annotations).toEqual({
			destructiveHint: false,
			openWorldHint: false,
			readOnlyHint: true,
		});
	});

	it("trims the subscriberId before the lookup", async () => {
		const fetchMock = stubApi(setupRoutes());

		const { reachability } = await checkReachability({ subscriberId: "  sub_8f21 " });

		expect(reachability?.status).toBe("found");
		expect(String(fetchMock.mock.calls[0][0])).toBe(`${API_URL}/v2/subscribers/sub_8f21`);
	});

	it("tries an email as given, trimmed, then trimmed in lowercase", async () => {
		const fetchMock = stubApi(
			setupRoutes({
				[search("email", " Jane@Acme.com ")]: [],
				[search("email", "Jane@Acme.com")]: [],
				[search("email", "jane@acme.com")]: [rawSubscriber()],
			}),
		);

		const { reachability } = await checkReachability({ email: " Jane@Acme.com " });

		expect(reachability?.status).toBe("found");
		expect(
			fetchMock.mock.calls
				.slice(0, 3)
				.map(([url]) => new URL(String(url)).searchParams.get("email")),
		).toEqual([" Jane@Acme.com ", "Jane@Acme.com", "jane@acme.com"]);
	});

	it("takes endpoint truncation from the page's next cursor, not the page size", async () => {
		const page = (next: string | null) =>
			respond(200, {
				data: Array.from({ length: 100 }, (_, index) => ({
					channel: "chat",
					connectionIdentifier: "slack-conn",
					contextKeys: [],
					identifier: `ep-${index}`,
					integrationIdentifier: "slack-1",
					providerId: "slack",
					type: "slack_channel",
				})),
				next,
			});
		const chatDetails = async (next: string | null) => {
			stubApi(setupRoutes({ "/v1/channel-endpoints": page(next) }));
			const { reachability } = await checkReachability({ subscriberId: "sub_8f21" });

			return reachability?.channels.find((verdict) => verdict.channel === "chat")?.details;
		};
		const note = "Only the first 100 endpoints were read; others weren't checked";

		// Exactly 100 endpoints: the API returns no next cursor.
		expect(await chatDetails(null)).not.toContain(note);
		expect(await chatDetails("cursor-2")).toContain(note);
	});

	it("retries an email in lowercase", async () => {
		const fetchMock = stubApi(
			setupRoutes({
				[search("email", "Jane@Acme.com")]: [],
				[search("email", "jane@acme.com")]: [rawSubscriber()],
			}),
		);

		const { reachability } = await checkReachability({ email: "Jane@Acme.com" });

		expect(reachability?.status).toBe("found");
		expect(String(fetchMock.mock.calls[1][0])).toContain("email=jane%40acme.com");
	});

	it("fails with the status when the lookup fails", async () => {
		stubApi(setupRoutes({ "/v2/subscribers/sub_8f21": respond(500, { message: "boom" }) }));

		const { result } = await checkReachability({ subscriberId: "sub_8f21" });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({ error: { status: 500 } });
	});

	it("fails with a 400 that asks for an identifier when none is given", async () => {
		stubApi(setupRoutes());

		const { result } = await checkReachability({});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		expect(textOf(result)).toContain("Give one of subscriberId, email, phone or name");
	});

	it("treats blank values as not given instead of matching any subscriber", async () => {
		const fetchMock = stubApi(setupRoutes());

		for (const args of [{ name: "   " }, { email: "  " }, { subscriberId: " " }]) {
			const { result } = await checkReachability(args);

			expect(result.isError, JSON.stringify(args)).toBe(true);
			expect(result.structuredContent).toMatchObject({ error: { status: 400 } });
		}
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
