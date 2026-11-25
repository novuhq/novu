import { describe, expect, it } from "vitest";
import type {
	ConnectionLookup,
	ReachabilityChannel,
	ReachabilityEndpoint,
	ReachabilityIntegration,
	ReachabilityPreferences,
	ReachabilitySubscriber,
	SubscriberReachabilityInput,
} from "../src/utils/reachability-model";
import {
	computeSubscriberReachability,
	subscriberDashboardPath,
} from "../src/utils/subscriber-reachability";

function subscriber(overrides: Partial<ReachabilitySubscriber> = {}): ReachabilitySubscriber {
	return {
		channels: [
			{
				deviceTokenCount: 2,
				hasPhoneNumber: false,
				hasWebhookUrl: false,
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

function found(contextKeys: string[] = [], hasWorkspaceId = true): ConnectionLookup {
	return { connection: { contextKeys, hasWorkspaceId }, status: "found" };
}

const FAILED: ConnectionLookup = { failure: { status: 500 }, status: "failed" };

function endpoint(overrides: Partial<ReachabilityEndpoint> = {}): ReachabilityEndpoint {
	return {
		channel: "chat",
		connection: found(),
		contextKeys: [],
		hasTenantId: false,
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
		expect(
			channelOf({ endpoints: [endpoint({ connection: { status: "missing" } })] }, "chat"),
		).toMatchObject({
			reasons: ["Slack endpoint has no connection"],
			state: "blocked",
		});
	});

	it("accepts an MS Teams endpoint that only has a tenant ID", () => {
		const chat = channelOf(
			{
				endpoints: [
					endpoint({
						connection: null,
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
				endpoints: [
					endpoint({ connection: found(["tenant:acme"]), contextKeys: ["tenant:acme"] }),
				],
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
			connection: null,
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
				// Two endpoints on the same unreadable connection give one reason.
				endpoints: [
					endpoint({ connection: FAILED }),
					endpoint({ connection: FAILED, type: "slack_channel" }),
				],
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
			checked({ endpoints: [endpoint({ connection: { status: "unchecked" } })] }),
		).not.toContain("channel connections");
	});

	it("only leaves an endpoint unverified when its own connection read failed", () => {
		const chat = channelOf(
			{
				endpoints: [
					endpoint({ connection: { status: "missing" } }),
					endpoint({ connection: FAILED, type: "slack_channel" }),
				],
				integrations: [...INTEGRATIONS, integration("chat", "whatsapp-business")],
			},
			"chat",
		);

		// The first endpoint's connection is gone (404), not a failed read, so it has no connection.
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
		const acmeConnection = found(["tenant:acme"]);

		expect(
			channelOf({ endpoints: [endpoint({ connection: acmeConnection })] }, "chat"),
		).toMatchObject({
			reasons: [
				"Slack endpoint's connection only applies to triggers with context tenant:acme",
			],
			state: "blocked",
		});

		const teams = (hasTenantId: boolean) =>
			channelOf(
				{
					endpoints: [
						endpoint({
							connection: acmeConnection,
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

	it("blocks an MS Teams endpoint whose matching connection has no workspace ID, without a tenant ID", () => {
		const chat = channelOf(
			{
				endpoints: [
					endpoint({
						connection: found([], false),
						integrationIdentifier: "msteams-1",
						providerId: "msteams",
						type: "ms_teams_user",
					}),
				],
				integrations: [...INTEGRATIONS, integration("chat", "msteams")],
			},
			"chat",
		);

		expect(chat).toMatchObject({
			reasons: ["MS Teams endpoint has no connection or tenant ID"],
			state: "blocked",
		});
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
						connection: null,
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
			connection: null,
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
						connection: null,
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

	it("keeps a definite chat problem when the endpoints can't be read", () => {
		const chat = channelOf(
			{
				endpoints: [],
				failures: { endpoints: { status: 500 } },
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

		expect(chat).toEqual({
			channel: "chat",
			details: [],
			reasons: [
				"Couldn't check channel endpoints (500)",
				"slack webhook is bound to an integration that is inactive or deleted",
			],
			state: "unknown",
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

	it("keeps a missing tool endpoint while a tool webhook is unverified", () => {
		const tool = channelOf(
			{
				integrations: [
					...INTEGRATIONS,
					integration("tool", "pagerduty"),
					integration("tool", "tool-webhook"),
				],
			},
			"tool",
		);

		expect(tool).toEqual({
			channel: "tool",
			details: [],
			reasons: [
				"Couldn't tell whether the tool-webhook-1 webhook sends per subscriber (its routing mode isn't visible); if it does, this subscriber has no endpoint for it",
				"No pagerduty endpoint for this subscriber",
			],
			state: "unknown",
		});
	});

	it("only counts a tool endpoint with context keys for a matching trigger context", () => {
		const tool = channelOf(
			{
				endpoints: [
					endpoint({
						channel: "tool",
						connection: null,
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
			{ endpoints: [endpoint({ connection: { status: "unchecked" } })] },
			"chat",
		);
		expect(uncheckedConnection).toMatchObject({
			reasons: ["Slack user endpoint's connection wasn't checked (lookup limit)"],
			state: "unknown",
		});

		const truncated = channelOf(
			{
				endpoints: [],
				endpointsTruncated: true,
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
