/**
 * Which channels can reach one subscriber, and why not, from data the Novu API already returns.
 * The rules mirror the worker's send path (`apps/worker/src/app/workflow/usecases/send-message`),
 * so keep them in step when it changes. Pure: the tool in `tools/subscriber-reachability.ts`
 * reads the API and drops every credential before calling this.
 *
 * The result never carries a phone number, custom data or credential values, only whether
 * each is present.
 */

import { asRecord } from "./activity-format";

export type ReachabilityChannel = "email" | "in_app" | "sms" | "push" | "chat" | "tool";

export type ReachabilityState = "reachable" | "partly" | "blocked" | "unknown";

export type ReachabilitySource =
	| "integrations"
	| "preferences"
	| "criticalPreferences"
	| "endpoints"
	| "connections";

export interface ReadFailure {
	/** HTTP status of the failed read; absent for network errors. */
	status?: number;
}

export interface ReachabilitySubscriberChannel {
	providerId: string;
	/** The integration the channel is bound to (`_integrationId`); the push worker sends only through it. */
	integrationId?: string | null;
	integrationIdentifier?: string | null;
	/** Only presence is read: the token count and whether a webhook URL or phone number is set. */
	deviceTokenCount: number;
	hasWebhookUrl: boolean;
	hasPhoneNumber: boolean;
}

export interface ReachabilitySubscriber {
	subscriberId: string;
	firstName?: string | null;
	lastName?: string | null;
	email?: string | null;
	hasPhone: boolean;
	lastOnlineAt?: string | null;
	isOnline?: boolean | null;
	environmentId?: string | null;
	channels: ReachabilitySubscriberChannel[];
}

export interface ReachabilityIntegration {
	id: string;
	identifier: string;
	providerId: string;
	channel: string;
	active: boolean;
	primary?: boolean;
	hasConditions: boolean;
	hasRules: boolean;
}

export type PreferenceChannels = Partial<Record<ReachabilityChannel, boolean>>;

export interface ReachabilityPreferences {
	global?: {
		enabled?: boolean;
		channels?: PreferenceChannels;
		schedule?: { isEnabled?: boolean } | null;
	};
	workflows?: Array<{
		enabled?: boolean;
		channels?: PreferenceChannels;
		workflow?: { name?: string; identifier?: string };
	}>;
}

export interface ReachabilityEndpoint {
	identifier: string;
	channel: string | null;
	providerId: string | null;
	integrationIdentifier: string | null;
	connectionIdentifier: string | null;
	contextKeys: string[];
	type: string;
	hasTenantId: boolean;
}

export interface ReachabilityConnection {
	identifier: string;
	hasWorkspaceId: boolean;
	contextKeys: string[];
}

export interface SubscriberReachabilityInput {
	subscriber: ReachabilitySubscriber;
	integrations: ReachabilityIntegration[];
	preferences?: ReachabilityPreferences;
	criticalPreferences?: ReachabilityPreferences;
	endpoints: ReachabilityEndpoint[];
	connections: ReachabilityConnection[];
	failures?: Partial<Record<ReachabilitySource, ReadFailure>>;
	/** Connection reads that failed with a status other than 404, by connection identifier. */
	connectionFailures?: Record<string, ReadFailure>;
	/** What the tool's read caps left out, so it isn't reported as missing setup. */
	limits?: {
		/** More endpoints may exist than the one page that was read. */
		endpointsTruncated?: boolean;
		/** Connections the endpoints reference but that weren't looked up. */
		uncheckedConnectionIds?: string[];
	};
}

export interface ChannelReachability {
	channel: ReachabilityChannel;
	state: ReachabilityState;
	/** Why the channel is blocked, unknown or only partly reachable, most severe first. */
	reasons: string[];
	/** How it reaches the subscriber, and conditions that don't block it. */
	details: string[];
}

export interface SubscriberReachabilityCandidate {
	subscriberId: string;
	name: string | null;
	email: string | null;
	dashboardPath: string;
}

export type SubscriberReachabilityResult =
	| {
			status: "found";
			environmentId: string | null;
			/** The subscriber's page, as a path under `/env/<environment>` in the dashboard. */
			dashboardPath: string;
			subscriber: {
				subscriberId: string;
				name: string | null;
				email: string | null;
				hasPhone: boolean;
				lastOnlineAt: string | null;
			};
			channels: ChannelReachability[];
			notes: string[];
			checked: string[];
	  }
	| { status: "not_found"; searched: { field: string; value?: string } }
	| {
			status: "ambiguous";
			candidates: SubscriberReachabilityCandidate[];
			/** More subscribers may match than the candidates listed. */
			hasMore: boolean;
	  };

/** Chat providers that deliver to `subscriber.phone` (send-message-chat `PHONE_BASED_CHAT_PROVIDERS`). */
const PHONE_BASED_CHAT_PROVIDERS = ["whatsapp-business", "sendblue", "photon-imessage"];

/** Integrations workflows never send through (SelectIntegration `isHiddenFromWorkflows`). */
const HIDDEN_FROM_WORKFLOWS_PROVIDERS = ["agent-email-inbox"];

/** Tool providers that only send to a subscriber's endpoint (shared `ENDPOINT_ROUTED_TOOL_PROVIDERS`). */
const ENDPOINT_ROUTED_TOOL_PROVIDERS = ["pagerduty", "opsgenie", "grafana"];

/**
 * The tool webhook needs an endpoint only with `routingMode: "dynamic"`, which sits in credentials
 * the API doesn't return to this caller (shared `isEndpointRoutedToolProvider`).
 */
const TOOL_WEBHOOK_PROVIDER = "tool-webhook";

const ENDPOINTS_READ_LIMIT_NOTE = "Only the first 100 endpoints were read; others weren't checked";

/** Endpoints match the trigger context exactly, so one without context keys only serves triggers without one. */
const CONTEXT_FREE_NOTE = "only for triggers without a context";

const CONTEXT_REASON = "Only reachable for triggers with a matching context";

const CONDITIONS_REASON = "Only for triggers that match the integration's conditions";

/** Endpoint types whose token comes from a linked connection (resolve-channel-endpoints). */
const CONNECTION_TOKEN_TYPES = ["slack_channel", "slack_user", "webex_room", "webex_person"];

const MS_TEAMS_TYPES = ["ms_teams_channel", "ms_teams_user"];

/** Channels whose non-critical steps wait for, or skip outside, the subscriber's schedule. */
const SCHEDULED_CHANNELS = "email, SMS, push and chat";

const MAX_LISTED_NAMES = 5;

const CHANNEL_LABELS: Record<ReachabilityChannel, string> = {
	chat: "chat",
	email: "email",
	in_app: "in-app",
	push: "push",
	sms: "SMS",
	tool: "tool",
};

const SOURCE_LABELS: Record<ReachabilitySource, string> = {
	connections: "channel connections",
	criticalPreferences: "critical workflows",
	endpoints: "channel endpoints",
	integrations: "integrations",
	preferences: "preferences",
};

const ENDPOINT_TYPE_LABELS: Record<string, string> = {
	line_user: "LINE user",
	ms_teams_channel: "MS Teams channel",
	ms_teams_user: "MS Teams user",
	phone: "Phone",
	slack_channel: "Slack channel",
	slack_user: "Slack user",
	telegram_chat: "Telegram chat",
	webex_person: "Webex person",
	webex_room: "Webex room",
	webhook: "Webhook",
};

/** The dashboard's subscriber page, as a path under `/env/<environment>`. */
export function subscriberDashboardPath(subscriberId: string): string {
	return `/subscribers/${encodeURIComponent(subscriberId)}`;
}

export function subscriberDisplayName(subscriber: {
	firstName?: string | null;
	lastName?: string | null;
}): string | null {
	const name = [subscriber.firstName, subscriber.lastName]
		.map((part) => part?.trim())
		.filter(Boolean)
		.join(" ");

	return name || null;
}

export function describeReadFailure(source: ReachabilitySource, failure: ReadFailure): string {
	const label = SOURCE_LABELS[source];
	if (failure.status === undefined) return `Couldn't check ${label} (request failed)`;
	if (failure.status === 403) return `Couldn't check ${label} (403: missing permission)`;
	if (failure.status === 401) return `Couldn't check ${label} (401: not authorized)`;

	return `Couldn't check ${label} (${failure.status})`;
}

/** One channel's verdict while it is being built: blockers win over unknowns, unknowns over partial gaps. */
class Verdict {
	readonly blockers: string[] = [];
	readonly unknowns: string[] = [];
	readonly partial: string[] = [];
	readonly details: string[] = [];

	constructor(readonly channel: ReachabilityChannel) {}

	toResult(): ChannelReachability {
		const state: ReachabilityState =
			this.blockers.length > 0
				? "blocked"
				: this.unknowns.length > 0
					? "unknown"
					: this.partial.length > 0
						? "partly"
						: "reachable";

		return {
			channel: this.channel,
			details: this.details,
			reasons: [...this.blockers, ...this.unknowns, ...this.partial],
			state,
		};
	}
}

export function computeSubscriberReachability(
	input: SubscriberReachabilityInput,
): Extract<SubscriberReachabilityResult, { status: "found" }> {
	const failures = { ...input.failures };
	// Any failed connection read means connections weren't fully checked.
	const [connectionFailure] = Object.values(input.connectionFailures ?? {});
	if (connectionFailure && !failures.connections) failures.connections = connectionFailure;
	const { subscriber } = input;
	const active = (channel: ReachabilityChannel) =>
		input.integrations.filter(
			(integration) =>
				integration.active &&
				integration.channel === channel &&
				!HIDDEN_FROM_WORKFLOWS_PROVIDERS.includes(integration.providerId),
		);

	const verdicts: Verdict[] = [
		primaryChannel(new Verdict("email"), active("email"), failures, {
			hasDestination: Boolean(subscriber.email),
			missing: "No email address",
		}),
		inAppChannel(new Verdict("in_app"), active("in_app"), failures, subscriber),
		primaryChannel(new Verdict("sms"), active("sms"), failures, {
			hasDestination: subscriber.hasPhone,
			missing: "No phone number",
		}),
		pushChannel(new Verdict("push"), input, active("push")),
		chatChannel(new Verdict("chat"), input, active("chat")),
	];

	if (failures.integrations) {
		// Tool endpoints show the channel is in use even when its integrations can't be read.
		if (input.endpoints.some((endpoint) => endpoint.channel === "tool")) {
			const tool = new Verdict("tool");
			tool.unknowns.push(describeReadFailure("integrations", failures.integrations));
			verdicts.push(tool);
		}
	} else if (active("tool").length > 0) {
		verdicts.push(toolChannel(new Verdict("tool"), input, active("tool")));
	}

	for (const verdict of verdicts) {
		applyPreferences(
			verdict,
			input.preferences,
			failures.preferences,
			input.criticalPreferences,
		);
	}

	return {
		channels: verdicts.map((verdict) => verdict.toResult()),
		checked: checkedSources(failures),
		dashboardPath: subscriberDashboardPath(subscriber.subscriberId),
		environmentId: subscriber.environmentId ?? null,
		notes: preferenceNotes(input),
		status: "found",
		subscriber: {
			email: subscriber.email || null,
			hasPhone: subscriber.hasPhone,
			lastOnlineAt: subscriber.lastOnlineAt ?? null,
			name: subscriberDisplayName(subscriber),
			subscriberId: subscriber.subscriberId,
		},
	};
}

/** Email and SMS: the subscriber's address plus the environment's active primary integration (SelectIntegration). */
function primaryChannel(
	verdict: Verdict,
	activeIntegrations: ReachabilityIntegration[],
	failures: Partial<Record<ReachabilitySource, ReadFailure>>,
	destination: { hasDestination: boolean; missing: string },
): Verdict {
	const label = CHANNEL_LABELS[verdict.channel];
	if (!destination.hasDestination) verdict.blockers.push(destination.missing);

	if (failures.integrations) {
		verdict.unknowns.push(describeReadFailure("integrations", failures.integrations));

		return verdict;
	}

	if (activeIntegrations.length === 0) {
		verdict.blockers.push(`No active ${label} integration`);

		return verdict;
	}

	const primary = activeIntegrations.find((integration) => integration.primary);
	if (primary) {
		verdict.details.push(`Sends with ${primary.providerId}`);
	} else if (
		activeIntegrations.some((integration) => integration.hasConditions || integration.hasRules)
	) {
		// Without a primary to fall back to, a trigger that matches no integration's conditions isn't sent.
		verdict.partial.push(CONDITIONS_REASON);
	} else {
		verdict.blockers.push(`No primary ${label} integration`);
	}

	return verdict;
}

function inAppChannel(
	verdict: Verdict,
	activeIntegrations: ReachabilityIntegration[],
	failures: Partial<Record<ReachabilitySource, ReadFailure>>,
	subscriber: ReachabilitySubscriber,
): Verdict {
	if (failures.integrations) {
		verdict.unknowns.push(describeReadFailure("integrations", failures.integrations));
	} else if (activeIntegrations.length === 0) {
		verdict.blockers.push("No active in-app integration");
	}

	if (subscriber.isOnline) verdict.details.push("Online now");
	else if (subscriber.lastOnlineAt) verdict.details.push(`Last seen ${subscriber.lastOnlineAt}`);
	else verdict.details.push("Never opened the Inbox");

	return verdict;
}

/** Push: device tokens on `subscriber.channels` for a provider with an active integration (send-message-push). */
function pushChannel(
	verdict: Verdict,
	input: SubscriberReachabilityInput,
	activeIntegrations: ReachabilityIntegration[],
): Verdict {
	if (input.failures?.integrations) {
		verdict.unknowns.push(describeReadFailure("integrations", input.failures.integrations));

		return verdict;
	}

	if (activeIntegrations.length === 0) {
		verdict.blockers.push("No active push integration");

		return verdict;
	}

	const withTokens = input.subscriber.channels.filter((channel) => channel.deviceTokenCount > 0);
	const devicesByProvider = new Map<string, number>();
	const orphans = new Set<string>();

	for (const channel of withTokens) {
		// The worker sends through the integration the channel is bound to, never a sibling of the same provider.
		const integration = activeIntegrations.find(
			(candidate) =>
				candidate.providerId === channel.providerId &&
				(channel.integrationId
					? candidate.id === channel.integrationId
					: !channel.integrationIdentifier ||
						candidate.identifier === channel.integrationIdentifier),
		);
		if (integration) {
			devicesByProvider.set(
				channel.providerId,
				(devicesByProvider.get(channel.providerId) ?? 0) + channel.deviceTokenCount,
			);
		} else if (channel.integrationId) {
			orphans.add(
				`Device tokens for ${channel.providerId} are bound to an integration that is inactive or deleted`,
			);
		} else {
			orphans.add(`Device tokens for ${channel.providerId}, which has no active integration`);
		}
	}

	for (const [providerId, count] of devicesByProvider) {
		verdict.details.push(`${count} ${count === 1 ? "device" : "devices"} on ${providerId}`);
	}

	const orphanReasons = [...orphans];

	if (devicesByProvider.size > 0) {
		verdict.partial.push(...orphanReasons);
	} else if (orphanReasons.length > 0) {
		verdict.blockers.push(...orphanReasons);
	} else {
		verdict.blockers.push("No push device tokens");
	}

	return verdict;
}

/**
 * Chat combines three sources (send-message-chat `resolveAllChannels`): channel endpoints, legacy
 * `subscriber.channels` webhooks, and the phone number for phone-based providers.
 */
function chatChannel(
	verdict: Verdict,
	input: SubscriberReachabilityInput,
	activeIntegrations: ReachabilityIntegration[],
): Verdict {
	const failures = input.failures ?? {};
	if (failures.integrations) {
		verdict.unknowns.push(describeReadFailure("integrations", failures.integrations));

		return verdict;
	}

	if (activeIntegrations.length === 0) {
		verdict.blockers.push("No active chat integration");

		return verdict;
	}

	const routes: string[] = [];
	const conditionalRoutes: string[] = [];
	const conditionReasons = new Set<string>();
	const problems: string[] = [];
	const unverified = new Set<string>();

	for (const endpoint of input.endpoints.filter((candidate) => candidate.channel === "chat")) {
		const check = checkEndpoint(endpoint, activeIntegrations, input);
		if (check.kind === "route") routes.push(check.text);
		else if (check.kind === "problem") problems.push(check.text);
		else if (check.kind === "unverified") unverified.add(check.text);
		else {
			conditionalRoutes.push(check.text);
			for (const reason of check.reasons) conditionReasons.add(reason);
		}
	}

	for (const channel of input.subscriber.channels.filter(
		(candidate) => candidate.deviceTokenCount === 0,
	)) {
		// Like push, a legacy chat channel sends only through the integration it's bound to; phone-based
		// providers pick their integration by provider instead (send-message-chat).
		const isPhoneBased = PHONE_BASED_CHAT_PROVIDERS.includes(channel.providerId);
		const bound = isPhoneBased ? null : channel.integrationId;
		const integration = activeIntegrations.find(
			(candidate) =>
				candidate.providerId === channel.providerId && (!bound || candidate.id === bound),
		);
		if (!integration) {
			const isChatProvider = input.integrations.some(
				(candidate) =>
					candidate.channel === "chat" && candidate.providerId === channel.providerId,
			);
			if (channel.hasWebhookUrl && (isChatProvider || bound)) {
				problems.push(
					bound
						? `${channel.providerId} webhook is bound to an integration that is inactive or deleted`
						: `${channel.providerId} webhook, but ${channel.providerId} has no active integration`,
				);
			}
			continue;
		}

		if (isPhoneBased) {
			// A stored channel sends only to its own number; without one the worker fails it (CHAT_MISSING_PHONE_NUMBER).
			if (channel.hasPhoneNumber) {
				routes.push(`${channel.providerId} phone number`);
			} else {
				problems.push(
					`${channel.providerId} channel has no phone number, and it replaces the phone number on file`,
				);
			}
		} else if (channel.hasWebhookUrl || channel.hasPhoneNumber) {
			routes.push(
				`${channel.providerId} ${channel.hasWebhookUrl ? "webhook" : "phone number"}`,
			);
		} else {
			problems.push(`${channel.providerId} channel has no webhook URL`);
		}
	}

	if (input.subscriber.hasPhone) routes.push(...phoneOnFileRoutes(input, activeIntegrations));

	verdict.details.push(...routes, ...conditionalRoutes);

	if (routes.length > 0) {
		verdict.partial.push(...problems);
		verdict.details.push(...unverified);
		if (failures.endpoints) {
			verdict.details.push(describeReadFailure("endpoints", failures.endpoints));
		}
		if (input.limits?.endpointsTruncated) verdict.details.push(ENDPOINTS_READ_LIMIT_NOTE);

		return verdict;
	}

	if (failures.endpoints) {
		verdict.unknowns.push(describeReadFailure("endpoints", failures.endpoints));
	}
	if (input.limits?.endpointsTruncated) verdict.unknowns.push(ENDPOINTS_READ_LIMIT_NOTE);
	verdict.unknowns.push(...unverified);

	if (conditionalRoutes.length > 0) {
		verdict.partial.push(...problems, ...conditionReasons);
	} else if (verdict.unknowns.length === 0) {
		verdict.blockers.push(
			...(problems.length > 0
				? problems
				: ["No chat endpoint, webhook or phone-based chat integration"]),
		);
	}

	return verdict;
}

/**
 * The phone number on file, once per phone-based provider with an active integration. The worker
 * skips it for a provider with a stored channel, and for one with an endpoint matching the trigger
 * context (send-message-chat `getLegacyChatChannels`).
 */
function phoneOnFileRoutes(
	input: SubscriberReachabilityInput,
	activeIntegrations: ReachabilityIntegration[],
): string[] {
	const storedProviders = new Set(input.subscriber.channels.map((channel) => channel.providerId));
	const providers = new Set(
		activeIntegrations
			.map((integration) => integration.providerId)
			.filter(
				(providerId) =>
					PHONE_BASED_CHAT_PROVIDERS.includes(providerId) &&
					!storedProviders.has(providerId),
			),
	);

	return [...providers].map((providerId) => {
		// Endpoints of an inactive integration are dropped before grouping, so they don't replace it.
		const hasEndpoint = input.endpoints.some(
			(endpoint) =>
				endpoint.channel === "chat" &&
				endpoint.providerId === providerId &&
				activeIntegrations.some(
					(integration) => integration.identifier === endpoint.integrationIdentifier,
				),
		);
		const route = `${providerId} to the phone number on file`;

		return hasEndpoint
			? `${route}, when no ${providerId} endpoint matches the trigger context`
			: route;
	});
}

type EndpointCheck =
	| { kind: "route"; text: string }
	| { kind: "problem"; text: string }
	| { kind: "unverified"; text: string }
	| { kind: "conditional"; text: string; reasons: string[] };

function checkEndpoint(
	endpoint: ReachabilityEndpoint,
	activeIntegrations: ReachabilityIntegration[],
	input: SubscriberReachabilityInput,
): EndpointCheck {
	const label = ENDPOINT_TYPE_LABELS[endpoint.type] ?? endpoint.type;
	const provider = label.split(" ").slice(0, -1).join(" ") || label;
	const integration = activeIntegrations.find(
		(candidate) => candidate.identifier === endpoint.integrationIdentifier,
	);

	if (!integration) {
		return {
			kind: "problem",
			text: `${label} endpoint uses an inactive or missing integration (${endpoint.integrationIdentifier})`,
		};
	}

	const connectionId = endpoint.connectionIdentifier;
	const found = connectionId
		? input.connections.find((candidate) => candidate.identifier === connectionId)
		: undefined;
	// The worker loads a connection only when its context matches the trigger's exactly, as the endpoint's must.
	const connection =
		found && sameKeys(found.contextKeys, endpoint.contextKeys) ? found : undefined;
	const missingConnection = (problem: string): EndpointCheck => {
		if (connectionId && (input.limits?.uncheckedConnectionIds ?? []).includes(connectionId)) {
			return {
				kind: "unverified",
				text: `${label} endpoint's connection wasn't checked (lookup limit)`,
			};
		}
		const failure = connectionId ? input.connectionFailures?.[connectionId] : undefined;
		if (failure) {
			return { kind: "unverified", text: describeReadFailure("connections", failure) };
		}
		if (found) {
			return {
				kind: "problem",
				text: `${provider} endpoint's connection only applies to ${triggersWithContext(found.contextKeys)}`,
			};
		}

		return { kind: "problem", text: problem };
	};

	if (CONNECTION_TOKEN_TYPES.includes(endpoint.type) && !connection) {
		return missingConnection(`${provider} endpoint has no connection`);
	}

	if (
		MS_TEAMS_TYPES.includes(endpoint.type) &&
		!connection?.hasWorkspaceId &&
		!endpoint.hasTenantId
	) {
		return missingConnection("MS Teams endpoint has no connection or tenant ID");
	}

	const contexts = endpoint.contextKeys.length > 0 ? [endpoint.contextKeys.join(", ")] : [];
	const { reasons, scope } = endpointScope(contexts, integration);
	const text = `${label} endpoint (${endpoint.integrationIdentifier ?? endpoint.providerId}), ${scope}`;

	return reasons.length > 0 ? { kind: "conditional", reasons, text } : { kind: "route", text };
}

/**
 * When an integration's endpoints are used (resolve-channel-endpoints): the trigger context must
 * match one endpoint's keys exactly, and an integration with rules must match them. `contexts`
 * holds each endpoint's joined keys; empty means context-free endpoints.
 */
function endpointScope(
	contexts: string[],
	integration: ReachabilityIntegration,
): { reasons: string[]; scope: string } {
	const reasons = [
		...(contexts.length > 0 ? [CONTEXT_REASON] : []),
		...(integration.hasRules ? [CONDITIONS_REASON] : []),
	];
	const context =
		contexts.length > 0
			? `only when the trigger context is exactly ${contexts.join(" or ")}`
			: CONTEXT_FREE_NOTE;

	return {
		reasons,
		scope: integration.hasRules
			? `${context}, when ${integration.identifier}'s conditions match`
			: context,
	};
}

function triggersWithContext(contextKeys: string[]): string {
	return contextKeys.length > 0
		? `triggers with context ${contextKeys.join(", ")}`
		: "triggers without a context";
}

/** Order-independent, like the worker's `$all` + `$size` match. */
function sameKeys(left: string[], right: string[]): boolean {
	return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

/**
 * Tool: endpoint-routed providers skip subscribers with no endpoint, and only an endpoint whose
 * context keys match the trigger exactly, on an integration whose rules match, is used
 * (send-message-tool, resolve-channel-endpoints). Other tool providers send through the integration itself.
 */
function toolChannel(
	verdict: Verdict,
	input: SubscriberReachabilityInput,
	activeIntegrations: ReachabilityIntegration[],
): Verdict {
	const routes: string[] = [];
	const conditionalRoutes: string[] = [];
	const conditionReasons = new Set<string>();
	const unknowns = new Set<string>();
	const missing: string[] = [];

	for (const integration of activeIntegrations) {
		const isWebhook = integration.providerId === TOOL_WEBHOOK_PROVIDER;
		if (!isWebhook && !ENDPOINT_ROUTED_TOOL_PROVIDERS.includes(integration.providerId)) {
			routes.push(`${integration.identifier} sends without a subscriber endpoint`);
			continue;
		}

		if (input.failures?.endpoints) {
			unknowns.add(describeReadFailure("endpoints", input.failures.endpoints));
			continue;
		}

		const endpoints = input.endpoints.filter(
			(endpoint) =>
				endpoint.channel === "tool" &&
				endpoint.integrationIdentifier === integration.identifier,
		);
		const contextual = endpoints.filter((endpoint) => endpoint.contextKeys.length > 0);

		if (endpoints.length > 0) {
			const count = endpoints.length - contextual.length;
			const { reasons, scope } = endpointScope(
				count > 0 ? [] : contextual.map((endpoint) => endpoint.contextKeys.join(", ")),
				integration,
			);
			const text =
				count > 0
					? `${count} ${pluralize(count, "endpoint")} for ${integration.identifier}, ${scope}`
					: `${integration.identifier}, ${scope}`;
			if (reasons.length > 0) {
				conditionalRoutes.push(text);
				for (const reason of reasons) conditionReasons.add(reason);
			} else {
				routes.push(text);
			}
		} else if (isWebhook) {
			unknowns.add(
				`Couldn't tell whether the ${integration.identifier} webhook sends per subscriber (its routing mode isn't visible); if it does, this subscriber has no endpoint for it`,
			);
		} else if (input.limits?.endpointsTruncated) {
			unknowns.add(ENDPOINTS_READ_LIMIT_NOTE);
		} else {
			missing.push(`No ${integration.providerId} endpoint for this subscriber`);
		}
	}

	verdict.details.push(...routes, ...conditionalRoutes);

	if (routes.length > 0) {
		verdict.partial.push(...missing);
		verdict.details.push(...unknowns);

		return verdict;
	}

	verdict.unknowns.push(...unknowns);
	if (conditionalRoutes.length > 0) {
		verdict.partial.push(...missing, ...conditionReasons);
	} else if (verdict.unknowns.length === 0) {
		verdict.blockers.push(
			...(missing.length > 0 ? missing : ["No tool endpoint for this subscriber"]),
		);
	}

	return verdict;
}

/**
 * Workflow entries carry the merged value per workflow (workflow defaults, then the subscriber's
 * global and workflow choices), so they decide; the global entry only decides when no active
 * workflow uses the channel. A missing channel key means no step uses it, not that it is off.
 */
function applyPreferences(
	verdict: Verdict,
	preferences: ReachabilityPreferences | undefined,
	failure: ReadFailure | undefined,
	criticalPreferences?: ReachabilityPreferences,
): void {
	if (failure) {
		if (verdict.blockers.length === 0) {
			verdict.unknowns.push(describeReadFailure("preferences", failure));
		}

		return;
	}

	if (!preferences) return;

	const { channel } = verdict;
	const globalOffReason =
		preferences.global?.enabled === false
			? "All notifications off globally"
			: preferences.global?.channels?.[channel] === false
				? "Off globally"
				: undefined;

	const workflows = (preferences.workflows ?? []).filter(
		(workflow) => workflow.channels?.[channel] !== undefined,
	);
	const off = workflows.filter(
		(workflow) => workflow.enabled === false || workflow.channels?.[channel] === false,
	);

	// Critical workflows ignore subscriber preferences, so they still send on a channel the subscriber turned off.
	const criticalSending = (criticalPreferences?.workflows ?? []).filter(
		(workflow) => workflow.channels?.[channel] === true,
	);
	const preferencesBlock = (reason: string) => {
		if (criticalSending.length > 0) {
			verdict.partial.push(
				`${reason}, but critical workflows still send: ${listNames(criticalSending)}`,
			);
		} else {
			verdict.blockers.push(reason);
		}
	};

	if (workflows.length === 0) {
		if (globalOffReason) preferencesBlock(globalOffReason);

		return;
	}

	if (off.length === workflows.length) {
		preferencesBlock(
			globalOffReason ??
				`Off for all ${workflows.length} ${pluralize(workflows.length, "workflow")} that use ${CHANNEL_LABELS[channel]}`,
		);

		return;
	}

	if (off.length > 0) {
		verdict.partial.push(
			`Off for ${off.length} ${pluralize(off.length, "workflow")}: ${listNames(off)}`,
		);
	}

	if (globalOffReason) {
		verdict.details.push(
			`${globalOffReason}, but turned back on for ${workflows.length - off.length} ${pluralize(workflows.length - off.length, "workflow")}`,
		);
	}
}

function preferenceNotes(input: SubscriberReachabilityInput): string[] {
	const notes: string[] = [];
	const failures = input.failures ?? {};

	const critical = input.criticalPreferences?.workflows ?? [];
	if (failures.criticalPreferences) {
		notes.push(describeReadFailure("criticalPreferences", failures.criticalPreferences));
	} else if (critical.length > 0) {
		notes.push(`Critical workflows ignore preferences: ${listNames(critical)}`);
	}

	if (input.preferences?.global?.schedule?.isEnabled) {
		notes.push(
			`A delivery schedule is on: non-critical ${SCHEDULED_CHANNELS} steps outside it are skipped or wait for it`,
		);
	}

	return notes;
}

function checkedSources(failures: Partial<Record<ReachabilitySource, ReadFailure>>): string[] {
	const sources: ReachabilitySource[] = [
		"integrations",
		"preferences",
		"criticalPreferences",
		"endpoints",
		"connections",
	];

	return [
		"profile",
		...sources.filter((source) => !failures[source]).map((source) => SOURCE_LABELS[source]),
	];
}

function listNames(
	workflows: Array<{ workflow?: { name?: string; identifier?: string } }>,
): string {
	const names = workflows.map(
		(workflow) => workflow.workflow?.name ?? workflow.workflow?.identifier ?? "unnamed",
	);
	const listed = names.slice(0, MAX_LISTED_NAMES).join(", ");

	return names.length > MAX_LISTED_NAMES
		? `${listed} and ${names.length - MAX_LISTED_NAMES} more`
		: listed;
}

function pluralize(count: number, word: string): string {
	return count === 1 ? word : `${word}s`;
}

const VISIBLE_PREFIX = 4;
const MIN_MASK_LENGTH = 4;

/** Partially masks a credential value, revealing only a short prefix (same as the dashboard's Credentials tab). */
export function maskCredentialValue(value: string): string {
	if (!value) {
		return "";
	}

	if (value.length <= VISIBLE_PREFIX) {
		return "•".repeat(value.length);
	}

	const maskLength = Math.max(value.length - VISIBLE_PREFIX, MIN_MASK_LENGTH);

	return `${value.slice(0, VISIBLE_PREFIX)}${"•".repeat(maskLength)}`;
}

/**
 * Masks `deviceTokens` and `webhookUrl` in each subscriber's `channels[].credentials`: one
 * subscriber, a list, or either inside the `{ data }` envelope. Everything else, including the
 * subscriber's custom `data`, is returned as is, so it can be sent back unchanged.
 */
export function maskSubscriberCredentials<T>(value: T): T {
	const envelope = asRecord(value);
	if (envelope && !isSubscriber(envelope) && "data" in envelope) {
		return { ...envelope, data: maskSubscribers(envelope.data) } as T;
	}

	return maskSubscribers(value) as T;
}

function maskSubscribers(value: unknown): unknown {
	return Array.isArray(value) ? value.map(maskSubscriber) : maskSubscriber(value);
}

function maskSubscriber(value: unknown): unknown {
	const subscriber = asRecord(value);
	if (!subscriber || !isSubscriber(subscriber) || !Array.isArray(subscriber.channels)) {
		return value;
	}

	return {
		...subscriber,
		channels: subscriber.channels.map((entry) => {
			const channel = asRecord(entry);
			const credentials = asRecord(channel?.credentials);
			if (!channel || !credentials) return entry;

			return { ...channel, credentials: maskChannelCredentials(credentials) };
		}),
	};
}

function maskChannelCredentials(credentials: Record<string, unknown>): Record<string, unknown> {
	const { deviceTokens, webhookUrl } = credentials;

	return {
		...credentials,
		...(Array.isArray(deviceTokens) && {
			deviceTokens: deviceTokens.map((token) =>
				typeof token === "string" ? maskCredentialValue(token) : token,
			),
		}),
		...(typeof webhookUrl === "string" && { webhookUrl: maskCredentialValue(webhookUrl) }),
	};
}

function isSubscriber(record: Record<string, unknown>): boolean {
	return typeof record.subscriberId === "string" || Array.isArray(record.channels);
}
