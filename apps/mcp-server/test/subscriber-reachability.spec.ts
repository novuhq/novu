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
	subscriberDashboardPath,
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
		id: `${providerId}-id`,
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
		connections: [{ contextKeys: [], hasWorkspaceId: true, identifier: "slack-conn" }],
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
		expect(channelOf({}, "chat").details).toContain(
			"Slack user endpoint (slack-1), only for triggers without a context",
		);
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
		const chat = channelOf(
			{
				connections: [
					{
						contextKeys: ["tenant:acme"],
						hasWorkspaceId: true,
						identifier: "slack-conn",
					},
				],
				endpoints: [endpoint({ contextKeys: ["tenant:acme"] })],
			},
			"chat",
		);

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

	it("lists the phone number on file once per phone-based provider", () => {
		const chat = channelOf(
			{
				endpoints: [],
				integrations: [
					...INTEGRATIONS,
					integration("chat", "whatsapp-business"),
					integration("chat", "whatsapp-business", {
						id: "whatsapp-2-id",
						identifier: "whatsapp-business-2",
					}),
				],
			},
			"chat",
		);

		expect(
			chat.details.filter((detail) => detail.startsWith("whatsapp-business to the phone")),
		).toEqual(["whatsapp-business to the phone number on file"]);
	});

	it("doesn't use the phone number on file for a provider with a stored channel", () => {
		const withStoredChannel = (hasPhoneNumber: boolean) =>
			channelOf(
				{
					endpoints: [],
					integrations: [...INTEGRATIONS, integration("chat", "whatsapp-business")],
					subscriber: subscriber({
						channels: [
							{
								deviceTokenCount: 0,
								hasPhoneNumber,
								hasWebhookUrl: false,
								integrationId: "whatsapp-business-id",
								providerId: "whatsapp-business",
							},
						],
					}),
				},
				"chat",
			);

		expect(withStoredChannel(false)).toMatchObject({
			details: [],
			reasons: [
				"whatsapp-business channel has no phone number, and it replaces the phone number on file",
			],
			state: "blocked",
		});
		expect(withStoredChannel(true)).toMatchObject({
			details: ["whatsapp-business phone number"],
			state: "reachable",
		});
	});

	it("uses the phone number on file only when no endpoint of that provider matches the trigger context", () => {
		const whatsappEndpoint = endpoint({
			connectionIdentifier: null,
			integrationIdentifier: "whatsapp-business-1",
			providerId: "whatsapp-business",
			type: "phone",
		});
		const integrations = [...INTEGRATIONS, integration("chat", "whatsapp-business")];

		expect(channelOf({ endpoints: [whatsappEndpoint], integrations }, "chat")).toMatchObject({
			details: [
				"Phone endpoint (whatsapp-business-1), only for triggers without a context",
				"whatsapp-business to the phone number on file, when no whatsapp-business endpoint matches the trigger context",
			],
			state: "reachable",
		});

		// The worker drops endpoints of an inactive integration, so the phone number on file still applies.
		const inactive = integrations.map((candidate) =>
			candidate.providerId === "whatsapp-business"
				? { ...candidate, active: false }
				: candidate,
		);
		expect(
			channelOf(
				{
					endpoints: [whatsappEndpoint],
					integrations: [
						...inactive,
						integration("chat", "whatsapp-business", {
							id: "whatsapp-2-id",
							identifier: "whatsapp-business-2",
						}),
					],
				},
				"chat",
			).details,
		).toContain("whatsapp-business to the phone number on file");
	});

	it("never sends email through the agent email inbox", () => {
		const inbox = integration("email", "agent-email-inbox", { primary: true });
		const nonPrimary = INTEGRATIONS.map((candidate) =>
			candidate.channel === "email" ? { ...candidate, primary: false } : candidate,
		);

		expect(channelOf({ integrations: [...nonPrimary, inbox] }, "email")).toMatchObject({
			reasons: ["No primary email integration"],
			state: "blocked",
		});
		expect(
			channelOf(
				{
					integrations: [
						...INTEGRATIONS.filter((candidate) => candidate.channel !== "email"),
						inbox,
					],
				},
				"email",
			),
		).toMatchObject({ reasons: ["No active email integration"], state: "blocked" });
	});

	it("reports a failed connections read on the chat verdict, not in the notes", () => {
		const result = computeSubscriberReachability(
			input({
				connectionFailures: { "slack-conn": { status: 500 } },
				connections: [],
				// Two endpoints on the same unreadable connection give one reason.
				endpoints: [endpoint(), endpoint({ identifier: "ep-2", type: "slack_channel" })],
			}),
		);

		expect(result.notes).toEqual([]);
		expect(result.channels.find((verdict) => verdict.channel === "chat")).toMatchObject({
			reasons: ["Couldn't check channel connections (500)"],
			state: "unknown",
		});
		expect(result.checked).not.toContain("channel connections");
	});

	it("lists connections as checked only when every referenced one was read", () => {
		const checked = (overrides: Partial<SubscriberReachabilityInput>) =>
			computeSubscriberReachability(input(overrides)).checked;

		expect(checked({})).toContain("channel connections");
		// No endpoint references a connection, or the endpoints read failed: none was read.
		expect(checked({ endpoints: [] })).not.toContain("channel connections");
		expect(checked({ endpoints: [], failures: { endpoints: { status: 500 } } })).not.toContain(
			"channel connections",
		);
		// The lookup cap skipped one; its endpoint says so.
		expect(
			checked({ connections: [], limits: { uncheckedConnectionIds: ["slack-conn"] } }),
		).not.toContain("channel connections");
	});

	it("only leaves an endpoint unverified when its own connection read failed", () => {
		const chat = channelOf(
			{
				connectionFailures: { "other-conn": { status: 500 } },
				connections: [],
				endpoints: [
					endpoint(),
					endpoint({
						connectionIdentifier: "other-conn",
						identifier: "ep-2",
						type: "slack_channel",
					}),
				],
				integrations: [...INTEGRATIONS, integration("chat", "whatsapp-business")],
			},
			"chat",
		);

		// slack-conn has no failed read (a 404 leaves none), so its endpoint has no connection.
		expect(chat).toMatchObject({
			details: [
				"whatsapp-business to the phone number on file",
				"Couldn't check channel connections (500)",
			],
			reasons: ["Slack endpoint has no connection"],
			state: "partly",
		});
	});

	it("only counts a connection whose context matches its endpoint's exactly", () => {
		const acmeConnection = {
			contextKeys: ["tenant:acme"],
			hasWorkspaceId: true,
			identifier: "slack-conn",
		};

		expect(channelOf({ connections: [acmeConnection] }, "chat")).toMatchObject({
			reasons: [
				"Slack endpoint's connection only applies to triggers with context tenant:acme",
			],
			state: "blocked",
		});

		const teams = (hasTenantId: boolean) =>
			channelOf(
				{
					connections: [{ ...acmeConnection, identifier: "teams-conn" }],
					endpoints: [
						endpoint({
							connectionIdentifier: "teams-conn",
							hasTenantId,
							integrationIdentifier: "msteams-1",
							providerId: "msteams",
							type: "ms_teams_user",
						}),
					],
					integrations: [...INTEGRATIONS, integration("chat", "msteams")],
				},
				"chat",
			);
		expect(teams(false)).toMatchObject({
			reasons: [
				"MS Teams endpoint's connection only applies to triggers with context tenant:acme",
			],
			state: "blocked",
		});
		// The endpoint's own tenant ID doesn't need the connection.
		expect(teams(true).state).toBe("reachable");
	});

	it("counts endpoints on an integration with rules as conditional routes", () => {
		const withRules = INTEGRATIONS.map((candidate) =>
			candidate.providerId === "slack" ? { ...candidate, hasRules: true } : candidate,
		);

		expect(channelOf({ integrations: withRules }, "chat")).toMatchObject({
			details: [
				"Slack user endpoint (slack-1), only for triggers without a context, when slack-1's conditions match",
			],
			reasons: ["Only for triggers that match the integration's conditions"],
			state: "partly",
		});

		const tool = channelOf(
			{
				endpoints: [
					endpoint({
						channel: "tool",
						connectionIdentifier: null,
						contextKeys: ["tenant:acme"],
						integrationIdentifier: "pagerduty-1",
						providerId: "pagerduty",
						type: "pagerduty_service",
					}),
				],
				integrations: [
					...INTEGRATIONS,
					integration("tool", "pagerduty", { hasRules: true }),
				],
			},
			"tool",
		);
		expect(tool).toMatchObject({
			details: [
				"pagerduty-1, only when the trigger context is exactly tenant:acme, when pagerduty-1's conditions match",
			],
			reasons: [
				"Only reachable for triggers with a matching context",
				"Only for triggers that match the integration's conditions",
			],
			state: "partly",
		});
	});

	it("reports the tool channel as unknown when integrations can't be read but tool endpoints exist", () => {
		const toolEndpoint = endpoint({
			channel: "tool",
			connectionIdentifier: null,
			integrationIdentifier: "pagerduty-1",
			providerId: "pagerduty",
			type: "pagerduty_service",
		});
		const result = computeSubscriberReachability(
			input({
				endpoints: [toolEndpoint],
				failures: { integrations: { status: 500 } },
				integrations: [],
			}),
		);

		expect(result.channels.find((verdict) => verdict.channel === "tool")).toMatchObject({
			reasons: ["Couldn't check integrations (500)"],
			state: "unknown",
		});
		expect(
			computeSubscriberReachability(
				input({ failures: { integrations: { status: 500 } }, integrations: [] }),
			).channels.map((verdict) => verdict.channel),
		).not.toContain("tool");
	});

	it("blocks email without a primary integration, and only partly reaches it through conditions", () => {
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
			details: [],
			reasons: ["Only for triggers that match the integration's conditions"],
			state: "partly",
		});

		const withRules = noPrimary.map((candidate) =>
			candidate.channel === "sms"
				? { ...candidate, hasRules: true, primary: false }
				: candidate,
		);
		expect(channelOf({ integrations: withRules }, "sms")).toMatchObject({
			reasons: ["Only for triggers that match the integration's conditions"],
			state: "partly",
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
			reasons: ["No pagerduty endpoint for this subscriber"],
			state: "blocked",
		});
	});

	it("says a tool endpoint without context keys only serves triggers without a context", () => {
		const tool = channelOf(
			{
				endpoints: [
					endpoint({
						channel: "tool",
						connectionIdentifier: null,
						integrationIdentifier: "pagerduty-1",
						providerId: "pagerduty",
						type: "pagerduty_service",
					}),
				],
				integrations: [...INTEGRATIONS, integration("tool", "pagerduty")],
			},
			"tool",
		);

		expect(tool).toMatchObject({
			details: ["1 endpoint for pagerduty-1, only for triggers without a context"],
			state: "reachable",
		});
	});

	it("blocks push tokens bound to an inactive integration, even when another one is active", () => {
		const push = channelOf(
			{
				subscriber: subscriber({
					channels: [
						{
							deviceTokenCount: 1,
							hasPhoneNumber: false,
							hasWebhookUrl: false,
							integrationId: "fcm-old-id",
							providerId: "fcm",
						},
					],
				}),
			},
			"push",
		);

		expect(push).toMatchObject({
			reasons: [
				"Device tokens for fcm are bound to an integration that is inactive or deleted",
			],
			state: "blocked",
		});
	});

	it("blocks a legacy chat webhook bound to an inactive integration, even when another one is active", () => {
		const chat = channelOf(
			{
				endpoints: [],
				subscriber: subscriber({
					channels: [
						{
							deviceTokenCount: 0,
							hasPhoneNumber: false,
							hasWebhookUrl: true,
							integrationId: "slack-old-id",
							providerId: "slack",
						},
					],
					hasPhone: false,
				}),
			},
			"chat",
		);

		expect(chat).toMatchObject({
			reasons: ["slack webhook is bound to an integration that is inactive or deleted"],
			state: "blocked",
		});
	});

	it("keeps a channel partly reachable when critical workflows still send on it", () => {
		const sms = channelOf(
			{
				criticalPreferences: {
					workflows: [{ channels: { sms: true }, workflow: { name: "Login code" } }],
				},
				preferences: preferences({
					global: { channels: { sms: false }, enabled: true },
					workflows: [],
				}),
			},
			"sms",
		);

		expect(sms).toMatchObject({
			reasons: ["Off globally, but critical workflows still send: Login code"],
			state: "partly",
		});
	});

	it("reaches chat through Photon iMessage and the phone number", () => {
		const chat = channelOf(
			{
				endpoints: [],
				integrations: [...INTEGRATIONS, integration("chat", "photon-imessage")],
			},
			"chat",
		);

		expect(chat.state).toBe("reachable");
		expect(chat.details).toContain("photon-imessage to the phone number on file");
	});

	it("can't tell whether a tool webhook without an endpoint reaches the subscriber", () => {
		const tool = channelOf(
			{ integrations: [...INTEGRATIONS, integration("tool", "tool-webhook")] },
			"tool",
		);

		expect(tool.state).toBe("unknown");
		expect(tool.reasons[0]).toContain(
			"Couldn't tell whether the tool-webhook-1 webhook sends per subscriber",
		);
	});

	it("only counts a tool endpoint with context keys for a matching trigger context", () => {
		const tool = channelOf(
			{
				endpoints: [
					endpoint({
						channel: "tool",
						connectionIdentifier: null,
						contextKeys: ["tenant:acme"],
						integrationIdentifier: "pagerduty-1",
						providerId: "pagerduty",
						type: "pagerduty_service",
					}),
				],
				integrations: [...INTEGRATIONS, integration("tool", "pagerduty")],
			},
			"tool",
		);

		expect(tool).toMatchObject({
			reasons: ["Only reachable for triggers with a matching context"],
			state: "partly",
		});
		expect(tool.details).toContain(
			"pagerduty-1, only when the trigger context is exactly tenant:acme",
		);
	});

	it("reports routes past the read limits as not checked instead of missing", () => {
		const uncheckedConnection = channelOf(
			{
				connections: [],
				limits: { uncheckedConnectionIds: ["slack-conn"] },
			},
			"chat",
		);
		expect(uncheckedConnection).toMatchObject({
			reasons: ["Slack user endpoint's connection wasn't checked (lookup limit)"],
			state: "unknown",
		});

		const truncated = channelOf(
			{
				endpoints: [],
				limits: { endpointsTruncated: true },
				subscriber: subscriber({ hasPhone: false }),
			},
			"chat",
		);
		expect(truncated).toMatchObject({
			reasons: ["Only the first 100 endpoints were read; others weren't checked"],
			state: "unknown",
		});
	});
});

describe("subscriberDashboardPath", () => {
	it("encodes the subscriberId into the subscriber page path", () => {
		expect(subscriberDashboardPath("jane@acme.com")).toBe("/subscribers/jane%40acme.com");
		expect(subscriberDashboardPath("team/42")).toBe("/subscribers/team%2F42");
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
		expect(reachability.dashboardPath).toBe("/subscribers/sub_8f21");
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
				"/v1/channel-connections/broken-conn": { body: { message: "boom" }, status: 500 },
				"/v1/channel-connections/deleted-conn": { body: { message: "gone" }, status: 404 },
				"/v1/channel-endpoints": [
					slackEndpoint("ep-acme", "acme-conn"),
					slackEndpoint("ep-deleted", "deleted-conn"),
					slackEndpoint("ep-broken", "broken-conn"),
				],
			}),
		);

		const { reachability } = await checkReachability({ subscriberId: "sub_8f21" });

		// The legacy Slack webhook still reaches the subscriber, so each endpoint's finding is listed.
		expect(
			reachability.channels.find(
				(verdict: { channel: string }) => verdict.channel === "chat",
			),
		).toMatchObject({
			details: ["slack webhook", "Couldn't check channel connections (500)"],
			reasons: [
				"Slack endpoint's connection only applies to triggers with context tenant:acme",
				"Slack endpoint has no connection",
			],
			state: "partly",
		});
		expect(reachability.checked).not.toContain("channel connections");
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
		const page = (count: number, next: string | null) => ({
			body: {
				data: Array.from({ length: count }, (_, index) =>
					rawSubscriber({ subscriberId: `sub_${index}` }),
				),
				next,
			},
			status: 200,
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

		expect(reachability.status).toBe("found");
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

		expect(reachability.status).toBe("found");
		expect(
			fetchMock.mock.calls
				.slice(0, 3)
				.map(([url]) => new URL(String(url)).searchParams.get("email")),
		).toEqual([" Jane@Acme.com ", "Jane@Acme.com", "jane@acme.com"]);
	});

	it("takes endpoint truncation from the page's next cursor, not the page size", async () => {
		const page = (next: string | null) => ({
			body: {
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
			},
			status: 200,
		});
		const chatDetails = async (next: string | null) => {
			stubApi(setupRoutes({ "/v1/channel-endpoints": page(next) }));
			const { reachability } = await checkReachability({ subscriberId: "sub_8f21" });

			return reachability.channels.find(
				(verdict: { channel: string }) => verdict.channel === "chat",
			).details;
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

	it("masks only channel credentials, so custom data can be sent back unchanged", async () => {
		const customData = {
			devices: { deviceTokens: ["custom-token"] },
			plan: "enterprise-secret-data",
			webhookUrl: "https://hooks.example.com/custom",
		};
		stubApi({
			"/v2/subscribers": {
				body: { data: [rawSubscriber({ data: customData })], next: null },
				status: 200,
			},
			"/v2/subscribers/sub_8f21": rawSubscriber({ data: customData }),
		});
		const client = await connectAllTools(tokenAccessors("api-key"));

		for (const [tool, args] of [
			["get_subscriber", { subscriberId: "sub_8f21" }],
			["find_subscribers", { email: "jane@acme.com" }],
		] as const) {
			const text = textOf(await callTool(client, tool, args));
			const body = JSON.parse(text.slice(text.indexOf("{")));
			const [found] = Array.isArray(body.data) ? body.data : [body.data];

			expect(found.data, tool).toEqual(customData);
			expect(text, tool).not.toContain("fcm-token-secret-1");
			expect(text, tool).not.toContain("hooks.slack.com");
		}
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

	it("logs the subscriberId once when preferences are updated", async () => {
		stubApi({ "/v2/subscribers/sub_8f21/preferences": { global: {} } });
		const log = vi.spyOn(console, "log").mockImplementation(() => {});
		const client = await connectAllTools(tokenAccessors("api-key"));

		await callTool(client, "update_subscriber_preferences", {
			channels: { sms: false },
			subscriberId: "sub_8f21",
		});

		expect(log).toHaveBeenCalledWith(
			"Successfully updated subscriber preferences for sub_8f21",
		);
		log.mockRestore();
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
