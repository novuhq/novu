import { afterEach, describe, expect, it, vi } from "vitest";
import {
	computeSubscriberReachability,
	maskCredentialValue,
	type ReachabilityChannel,
	type ReachabilityEndpoint,
	type ReachabilityIntegration,
	type ReachabilityPreferences,
	type ReachabilitySubscriber,
	type SubscriberReachabilityInput,
} from "../src/utils/subscriber-reachability";
import { API_URL, callTool, connectAllTools, textOf, tokenAccessors } from "./support";

function subscriber(overrides: Partial<ReachabilitySubscriber> = {}): ReachabilitySubscriber {
	return {
		channels: [
			{
				deviceTokenCount: 2,
				hasPhoneNumber: false,
				hasWebhookUrl: false,
				integrationIdentifier: null,
				providerId: "fcm",
			},
		],
		email: "jane@acme.com",
		environmentId: "env-1",
		firstName: "Jane",
		hasPhone: true,
		isOnline: false,
		lastName: "Alvarez",
		lastOnlineAt: "2026-11-22T10:00:00.000Z",
		subscriberId: "sub_8f21",
		...overrides,
	};
}

function integration(
	channel: string,
	providerId: string,
	overrides: Partial<ReachabilityIntegration> = {},
): ReachabilityIntegration {
	return {
		active: true,
		channel,
		hasConditions: false,
		hasRules: false,
		identifier: `${providerId}-1`,
		primary: channel === "email" || channel === "sms",
		providerId,
		...overrides,
	};
}

const INTEGRATIONS = [
	integration("email", "sendgrid"),
	integration("sms", "twilio"),
	integration("in_app", "novu"),
	integration("push", "fcm"),
	integration("chat", "slack"),
];

function endpoint(overrides: Partial<ReachabilityEndpoint> = {}): ReachabilityEndpoint {
	return {
		channel: "chat",
		connectionIdentifier: "slack-conn",
		contextKeys: [],
		hasTenantId: false,
		identifier: "ep-1",
		integrationIdentifier: "slack-1",
		providerId: "slack",
		type: "slack_user",
		...overrides,
	};
}

function preferences(overrides: Partial<ReachabilityPreferences> = {}): ReachabilityPreferences {
	return {
		global: {
			channels: { chat: true, email: true, in_app: true, push: true, sms: true },
			enabled: true,
		},
		workflows: [
			{
				channels: { email: true, in_app: true, sms: true },
				enabled: true,
				workflow: { identifier: "password-reset", name: "Password reset" },
			},
		],
		...overrides,
	};
}

function input(overrides: Partial<SubscriberReachabilityInput> = {}): SubscriberReachabilityInput {
	return {
		connections: [{ hasWorkspaceId: true, identifier: "slack-conn" }],
		criticalPreferences: { workflows: [] },
		endpoints: [endpoint()],
		integrations: INTEGRATIONS,
		preferences: preferences(),
		subscriber: subscriber(),
		...overrides,
	};
}

function channelOf(overrides: Partial<SubscriberReachabilityInput>, channel: ReachabilityChannel) {
	const result = computeSubscriberReachability(input(overrides));
	const verdict = result.channels.find((candidate) => candidate.channel === channel);
	if (!verdict) throw new Error(`no ${channel} verdict`);

	return verdict;
}

describe("computeSubscriberReachability", () => {
	it("reaches a fully set-up subscriber on every channel", () => {
		const result = computeSubscriberReachability(input());

		expect(result.channels.map(({ channel, state }) => [channel, state])).toEqual([
			["email", "reachable"],
			["in_app", "reachable"],
			["sms", "reachable"],
			["push", "reachable"],
			["chat", "reachable"],
		]);
		expect(result.subscriber).toEqual({
			email: "jane@acme.com",
			hasPhone: true,
			lastOnlineAt: "2026-11-22T10:00:00.000Z",
			name: "Jane Alvarez",
			subscriberId: "sub_8f21",
		});
		expect(channelOf({}, "push").details).toEqual(["2 devices on fcm"]);
		expect(channelOf({}, "chat").details).toContain("Slack user endpoint (slack-1)");
	});

	it("blocks SMS when the subscriber has no phone number", () => {
		const sms = channelOf({ subscriber: subscriber({ hasPhone: false }) }, "sms");

		expect(sms.state).toBe("blocked");
		expect(sms.reasons).toEqual(["No phone number"]);
	});

	it("blocks SMS that is off globally", () => {
		const offEverywhere = preferences({
			global: { channels: { sms: false }, enabled: true },
			workflows: [{ channels: { sms: false }, workflow: { name: "Password reset" } }],
		});

		expect(channelOf({ preferences: offEverywhere }, "sms")).toMatchObject({
			reasons: ["Off globally"],
			state: "blocked",
		});
		expect(
			channelOf(
				{
					preferences: preferences({
						global: { channels: { sms: false } },
						workflows: [],
					}),
				},
				"sms",
			).state,
		).toBe("blocked");
	});

	it("reports a channel that one workflow turned off as partly reachable", () => {
		const email = channelOf(
			{
				preferences: preferences({
					workflows: [
						{ channels: { email: true }, workflow: { name: "Password reset" } },
						{ channels: { email: false }, workflow: { name: "Newsletter" } },
					],
				}),
			},
			"email",
		);

		expect(email.state).toBe("partly");
		expect(email.reasons).toEqual(["Off for 1 workflow: Newsletter"]);
	});

	it("treats a missing preference key as not off", () => {
		const sms = channelOf(
			{
				preferences: preferences({
					global: { channels: { email: true }, enabled: true },
					workflows: [{ channels: { email: true }, workflow: { name: "Digest" } }],
				}),
			},
			"sms",
		);

		expect(sms.state).toBe("reachable");
	});

	it("notes that critical workflows ignore preferences", () => {
		const result = computeSubscriberReachability(
			input({
				criticalPreferences: { workflows: [{ workflow: { name: "Password reset" } }] },
			}),
		);

		expect(result.notes).toContain("Critical workflows ignore preferences: Password reset");
	});

	it("blocks push without device tokens", () => {
		const push = channelOf({ subscriber: subscriber({ channels: [] }) }, "push");

		expect(push).toMatchObject({ reasons: ["No push device tokens"], state: "blocked" });
	});

	it("blocks push tokens whose provider has no active integration", () => {
		const apnsOnly = subscriber({
			channels: [
				{
					deviceTokenCount: 1,
					hasPhoneNumber: false,
					hasWebhookUrl: false,
					providerId: "apns",
				},
			],
		});

		expect(channelOf({ subscriber: apnsOnly }, "push")).toMatchObject({
			reasons: ["Device tokens for apns, which has no active integration"],
			state: "blocked",
		});

		const both = subscriber({
			channels: [...subscriber().channels, ...apnsOnly.channels],
		});
		expect(channelOf({ subscriber: both }, "push").state).toBe("partly");
	});

	it("blocks a Slack endpoint without a connection", () => {
		expect(channelOf({ connections: [] }, "chat")).toMatchObject({
			reasons: ["Slack endpoint has no connection"],
			state: "blocked",
		});
	});

	it("accepts an MS Teams endpoint that only has a tenant ID", () => {
		const chat = channelOf(
			{
				connections: [],
				endpoints: [
					endpoint({
						connectionIdentifier: null,
						hasTenantId: true,
						integrationIdentifier: "msteams-1",
						providerId: "msteams",
						type: "ms_teams_user",
					}),
				],
				integrations: [...INTEGRATIONS, integration("chat", "msteams")],
			},
			"chat",
		);

		expect(chat.state).toBe("reachable");
	});

	it("only counts an endpoint with context keys for a matching trigger context", () => {
		const chat = channelOf({ endpoints: [endpoint({ contextKeys: ["tenant:acme"] })] }, "chat");

		expect(chat.state).toBe("partly");
		expect(chat.reasons).toEqual(["Only reachable for triggers with a matching context"]);
		expect(chat.details).toContain(
			"Slack user endpoint (slack-1), only when the trigger context is exactly tenant:acme",
		);
	});

	it("reaches chat through a phone-based provider", () => {
		const chat = channelOf(
			{
				endpoints: [],
				integrations: [...INTEGRATIONS, integration("chat", "whatsapp-business")],
			},
			"chat",
		);

		expect(chat.state).toBe("reachable");
		expect(chat.details).toContain("whatsapp-business to the phone number on file");
	});

	it("blocks email without a primary integration unless one has conditions", () => {
		const noPrimary = INTEGRATIONS.map((candidate) =>
			candidate.channel === "email" ? { ...candidate, primary: false } : candidate,
		);
		expect(channelOf({ integrations: noPrimary }, "email")).toMatchObject({
			reasons: ["No primary email integration"],
			state: "blocked",
		});

		const conditioned = noPrimary.map((candidate) =>
			candidate.channel === "email" ? { ...candidate, hasConditions: true } : candidate,
		);
		expect(channelOf({ integrations: conditioned }, "email")).toMatchObject({
			details: ["Depends on integration conditions"],
			state: "reachable",
		});
	});

	it("reports unknown, not blocked, when integrations can't be read", () => {
		const result = computeSubscriberReachability(
			input({ failures: { integrations: { status: 403 } }, integrations: [] }),
		);

		const email = result.channels.find((verdict) => verdict.channel === "email");
		expect(email).toMatchObject({
			reasons: ["Couldn't check integrations (403: missing permission)"],
			state: "unknown",
		});
		expect(result.checked).not.toContain("integrations");
	});

	it("keeps a definite blocker when preferences can't be read", () => {
		const failures = { preferences: { status: 500 } };

		expect(channelOf({ failures, preferences: undefined }, "email").state).toBe("unknown");
		expect(
			channelOf(
				{ failures, preferences: undefined, subscriber: subscriber({ hasPhone: false }) },
				"sms",
			).reasons,
		).toEqual(["No phone number"]);
	});

	it("reports the tool channel only when a tool integration is active", () => {
		expect(
			computeSubscriberReachability(input()).channels.map((verdict) => verdict.channel),
		).not.toContain("tool");

		const tool = channelOf(
			{ integrations: [...INTEGRATIONS, integration("tool", "pagerduty")] },
			"tool",
		);
		expect(tool).toMatchObject({
			reasons: ["No tool endpoint for this subscriber"],
			state: "blocked",
		});
	});
});

describe("maskCredentialValue", () => {
	it("keeps a four-character prefix", () => {
		expect(maskCredentialValue("abcdefgh")).toBe("abcd••••");
		expect(maskCredentialValue("abc")).toBe("•••");
		expect(maskCredentialValue("")).toBe("");
	});
});

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

function rawSubscriber(overrides: Record<string, unknown> = {}) {
	return {
		_environmentId: "env-1",
		channels: [
			{
				credentials: { deviceTokens: ["fcm-token-secret-1", "fcm-token-secret-2"] },
				integrationIdentifier: "fcm-1",
				providerId: "fcm",
			},
			{
				credentials: { webhookUrl: "https://hooks.slack.com/services/SECRET" },
				providerId: "slack",
			},
		],
		data: { plan: "enterprise-secret-data" },
		email: "jane@acme.com",
		firstName: "Jane",
		isOnline: false,
		lastName: "Alvarez",
		lastOnlineAt: "2026-11-22T10:00:00.000Z",
		phone: "+15550001234",
		subscriberId: "sub_8f21",
		...overrides,
	};
}

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

type Route = unknown | { status: number; body: unknown };

function respond(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), {
		headers: { "Content-Type": "application/json" },
		status,
	});
}

/** Answers by path plus query string, falling back to the path; `{ status, body }` sets the status. */
function stubApi(routes: Record<string, Route>) {
	const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
		const { pathname, search } = new URL(url);
		const route = routes[`${pathname}${search}`] ?? routes[pathname];
		if (route === undefined)
			return respond({ message: `unexpected ${pathname}${search}` }, 500);
		if (route && typeof route === "object" && "status" in route && "body" in route) {
			const { body, status } = route as { status: number; body: unknown };

			return respond(body, status);
		}

		return respond(init?.method === "PATCH" ? route : { data: route });
	});
	vi.stubGlobal("fetch", fetchMock);

	return fetchMock;
}

function search(field: string, value: string) {
	return `/v2/subscribers?${new URLSearchParams({ [field]: value, limit: "10" }).toString()}`;
}

function setupRoutes(overrides: Record<string, Route> = {}): Record<string, Route> {
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
		reachability: (result.structuredContent as { reachability?: any })?.reachability,
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
		expect(reachability.status).toBe("found");
		expect(reachability.environmentId).toBe("env-1");
		expect(
			reachability.channels.map(({ channel, state }: { channel: string; state: string }) => [
				channel,
				state,
			]),
		).toEqual([
			["email", "reachable"],
			["in_app", "reachable"],
			["sms", "reachable"],
			["push", "reachable"],
			["chat", "reachable"],
		]);
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
				"/v2/subscribers/missing": { body: { message: "not found" }, status: 404 },
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
				{ email: "jane@acme.com", name: "Jane Alvarez", subscriberId: "sub_8f21" },
				{ email: "jane.doe@acme.com", name: "Jane Doe", subscriberId: "sub_1c09" },
			],
			status: "ambiguous",
		});
	});

	it("retries an email in lowercase", async () => {
		const fetchMock = stubApi(
			setupRoutes({
				[search("email", "Jane@Acme.com")]: [],
				[search("email", "jane@acme.com")]: [rawSubscriber()],
			}),
		);

		const { reachability } = await checkReachability({ email: "Jane@Acme.com" });

		expect(reachability.status).toBe("found");
		expect(String(fetchMock.mock.calls[1][0])).toContain("email=jane%40acme.com");
	});

	it("fails with the status when the lookup fails", async () => {
		stubApi(
			setupRoutes({ "/v2/subscribers/sub_8f21": { body: { message: "boom" }, status: 500 } }),
		);

		const { result } = await checkReachability({ subscriberId: "sub_8f21" });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({ error: { status: 500 } });
	});

	it("asks for an identifier when none is given", async () => {
		stubApi(setupRoutes());

		const { result } = await checkReachability({});

		expect(textOf(result)).toContain("At least one query parameter is required");
	});
});

describe("subscriber tools", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("masks push tokens and webhook URLs in get_subscriber", async () => {
		stubApi({ "/v2/subscribers/sub_8f21": rawSubscriber() });
		const client = await connectAllTools(tokenAccessors("api-key"));

		const text = textOf(await callTool(client, "get_subscriber", { subscriberId: "sub_8f21" }));

		expect(text).toContain("Successfully fetched subscriber sub_8f21:");
		expect(text).not.toContain("fcm-token-secret-1");
		expect(text).not.toContain("hooks.slack.com");
		expect(text).toContain("fcm-••••••••••••••");
		expect(text).toContain("jane@acme.com");
	});

	it("updates only the preference channels it is given", async () => {
		const fetchMock = stubApi({ "/v2/subscribers/sub_8f21/preferences": { global: {} } });
		const client = await connectAllTools(tokenAccessors("api-key"));

		await callTool(client, "update_subscriber_preferences", {
			channels: { sms: false },
			subscriberId: "sub_8f21",
		});

		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe("PATCH");
		expect(JSON.parse(String(init?.body))).toEqual({ channels: { sms: false } });
	});

	it("still accepts all five channels and refuses none", async () => {
		const fetchMock = stubApi({ "/v2/subscribers/sub_8f21/preferences": { global: {} } });
		const client = await connectAllTools(tokenAccessors("api-key"));

		const allFive = await callTool(client, "update_subscriber_preferences", {
			channels: { chat: true, email: true, in_app: true, push: true, sms: false },
			subscriberId: "sub_8f21",
		});
		expect(allFive.isError).toBeFalsy();

		const none = await callTool(client, "update_subscriber_preferences", {
			channels: {},
			subscriberId: "sub_8f21",
		});
		expect(none.isError).toBe(true);
		expect(textOf(none)).toContain('e.g. { "sms": false }');
		expect(fetchMock).toHaveBeenCalledTimes(1);
	});
});
