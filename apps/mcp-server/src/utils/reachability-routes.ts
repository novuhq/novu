/**
 * Push, chat and tool reachability. Each device group, endpoint, stored channel, phone-based
 * provider or tool integration becomes a `RouteFinding`, and `settleRoutes` turns the findings
 * into the verdict. Mirrors send-message-push, send-message-chat, send-message-tool and
 * resolve-channel-endpoints in the worker.
 */

import {
	CONDITIONS_REASON,
	type ConnectionLookup,
	describeReadFailure,
	ENDPOINTS_READ_LIMIT,
	pluralize,
	type ReachabilityEndpoint,
	type ReachabilityIntegration,
	type ReachabilitySubscriberChannel,
	type RuleContext,
	type SubscriberReachabilityInput,
	type Verdict,
} from "./reachability-model";

/** Chat providers that deliver to `subscriber.phone` (send-message-chat `PHONE_BASED_CHAT_PROVIDERS`). */
const PHONE_BASED_CHAT_PROVIDERS = ["whatsapp-business", "sendblue", "photon-imessage"];

/** Tool providers that only send to a subscriber's endpoint (shared `ENDPOINT_ROUTED_TOOL_PROVIDERS`). */
const ENDPOINT_ROUTED_TOOL_PROVIDERS = ["pagerduty", "opsgenie", "grafana"];

/**
 * The tool webhook needs an endpoint only with `routingMode: "dynamic"`, which sits in credentials
 * the API doesn't return to this caller (shared `isEndpointRoutedToolProvider`).
 */
const TOOL_WEBHOOK_PROVIDER = "tool-webhook";

const ENDPOINTS_READ_LIMIT_NOTE = `Only the first ${ENDPOINTS_READ_LIMIT} endpoints were read; others weren't checked`;

/** Endpoints match the trigger context exactly, so one without context keys only serves triggers without one. */
const CONTEXT_FREE_NOTE = "only for triggers without a context";

const CONTEXT_REASON = "Only reachable for triggers with a matching context";

interface EndpointType {
	label: string;
	/** Names the endpoint in connection findings. */
	provider: string;
	/**
	 * What the endpoint needs besides its integration (resolve-channel-endpoints): a linked
	 * connection for its token, or for MS Teams a connection's workspace or its own tenant ID.
	 */
	needs?: "connection" | "connection_or_tenant";
}

const ENDPOINT_TYPES: Record<string, EndpointType> = {
	line_user: { label: "LINE user", provider: "LINE" },
	ms_teams_channel: {
		label: "MS Teams channel",
		needs: "connection_or_tenant",
		provider: "MS Teams",
	},
	ms_teams_user: { label: "MS Teams user", needs: "connection_or_tenant", provider: "MS Teams" },
	phone: { label: "Phone", provider: "Phone" },
	slack_channel: { label: "Slack channel", needs: "connection", provider: "Slack" },
	slack_user: { label: "Slack user", needs: "connection", provider: "Slack" },
	telegram_chat: { label: "Telegram chat", provider: "Telegram" },
	webex_person: { label: "Webex person", needs: "connection", provider: "Webex" },
	webex_room: { label: "Webex room", needs: "connection", provider: "Webex" },
	webhook: { label: "Webhook", provider: "Webhook" },
};

/** One way a push, chat or tool message could reach the subscriber, or why one can't. */
type RouteFinding =
	| { kind: "route"; text: string; conditions: string[] } // [] = unconditional
	| { kind: "problem"; text: string }
	| { kind: "unverified"; text: string };

type Route = Extract<RouteFinding, { kind: "route" }>;

/** Push: device tokens on `subscriber.channels` for a provider with an active integration (send-message-push). */
export function pushChannel(v: Verdict, ctx: RuleContext): void {
	settleRoutes(v, deviceFindings(ctx), { gaps: [], none: "No push device tokens" });
}

/**
 * Chat combines three sources (send-message-chat `resolveAllChannels`): channel endpoints, legacy
 * `subscriber.channels` webhooks, and the phone number for phone-based providers.
 */
export function chatChannel(v: Verdict, ctx: RuleContext): void {
	const { endpointsTruncated, failures } = ctx.input;

	settleRoutes(
		v,
		[...endpointFindings(ctx), ...storedChannelFindings(ctx), ...phoneOnFileFindings(ctx)],
		{
			gaps: [
				...(failures?.endpoints
					? [describeReadFailure("endpoints", failures.endpoints)]
					: []),
				...(endpointsTruncated ? [ENDPOINTS_READ_LIMIT_NOTE] : []),
			],
			none: "No chat endpoint, webhook or phone-based chat integration",
		},
	);
}

/**
 * Tool: endpoint-routed providers skip subscribers with no endpoint, and only an endpoint whose
 * context keys match the trigger exactly, on an integration whose rules match, is used
 * (send-message-tool, resolve-channel-endpoints). Other tool providers send through the integration itself.
 */
export function toolChannel(v: Verdict, { active, input }: RuleContext): void {
	settleRoutes(
		v,
		active.map((integration) => toolFinding(integration, input)),
		{ gaps: [], none: "No tool endpoint for this subscriber" },
	);
}

/**
 * Tool is reported only once it's set up: an active integration or, when integrations can't be
 * read, a tool endpoint that shows the channel is in use.
 */
export function toolInUse({ active, input }: RuleContext): boolean {
	return input.failures?.integrations
		? input.endpoints.some((endpoint) => endpoint.channel === "tool")
		: active.length > 0;
}

/**
 * Always-on routes reach the subscriber whatever else is wrong, so the rest only narrows the verdict.
 * Without one, anything unverified (and `gaps`, what the reads left out) leaves it unknown, and
 * conditional routes leave it partly reachable; either way the problems are kept as partial
 * reasons. With neither, the problems, or `none`, block it.
 */
function settleRoutes(
	v: Verdict,
	findings: RouteFinding[],
	o: { gaps: string[]; none: string },
): void {
	const routes = findings.filter((finding): finding is Route => finding.kind === "route");
	const always = routes.filter((route) => route.conditions.length === 0);
	const conditional = routes.filter((route) => route.conditions.length > 0);
	const problems = textsOf(findings, "problem");
	const unverified = [...new Set(textsOf(findings, "unverified"))];

	v.details.push(...[...always, ...conditional].map((route) => route.text));

	if (always.length > 0) {
		v.partial.push(...problems);
		v.details.push(...unverified, ...o.gaps);

		return;
	}

	const unknowns = [...o.gaps, ...unverified];
	v.unknowns.push(...unknowns);

	if (conditional.length > 0 || unknowns.length > 0) {
		v.partial.push(...problems, ...new Set(conditional.flatMap((route) => route.conditions)));
	} else {
		v.blockers.push(...(problems.length > 0 ? problems : [o.none]));
	}
}

function textsOf(findings: RouteFinding[], kind: RouteFinding["kind"]): string[] {
	return findings.filter((finding) => finding.kind === kind).map((finding) => finding.text);
}

/** One route per provider whose tokens reach an active integration, and one problem per distinct orphan reason. */
function deviceFindings({ active, input }: RuleContext): RouteFinding[] {
	const devicesByProvider = new Map<string, number>();
	const orphans = new Set<string>();

	for (const channel of input.subscriber.channels.filter((entry) => entry.deviceTokenCount > 0)) {
		const integration = boundIntegration(active, channel.providerId, channel.integrationId);
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

	return [
		...[...devicesByProvider].map(
			([providerId, count]): RouteFinding => ({
				conditions: [],
				kind: "route",
				text: `${count} ${pluralize(count, "device")} on ${providerId}`,
			}),
		),
		...[...orphans].map((text): RouteFinding => ({ kind: "problem", text })),
	];
}

/**
 * The active integration a stored channel sends through: the one it's bound to (`_integrationId`),
 * never a sibling of the same provider, or any of the provider's when it's bound to none.
 */
function boundIntegration(
	active: ReachabilityIntegration[],
	providerId: string,
	integrationId: string | null | undefined,
): ReachabilityIntegration | undefined {
	return active.find(
		(candidate) =>
			candidate.providerId === providerId &&
			(!integrationId || candidate.id === integrationId),
	);
}

/** The active integration an endpoint belongs to; the worker drops endpoints of any other. */
function endpointIntegration(
	endpoint: ReachabilityEndpoint,
	active: ReachabilityIntegration[],
): ReachabilityIntegration | undefined {
	return active.find((candidate) => candidate.identifier === endpoint.integrationIdentifier);
}

function endpointFindings(ctx: RuleContext): RouteFinding[] {
	return ctx.input.endpoints
		.filter((endpoint) => endpoint.channel === "chat")
		.map((endpoint) => endpointFinding(endpoint, ctx));
}

function endpointFinding(endpoint: ReachabilityEndpoint, { active }: RuleContext): RouteFinding {
	const type = ENDPOINT_TYPES[endpoint.type] ?? { label: endpoint.type, provider: endpoint.type };
	const integration = endpointIntegration(endpoint, active);

	if (!integration) {
		return {
			kind: "problem",
			text: `${type.label} endpoint uses an inactive or missing integration (${endpoint.integrationIdentifier})`,
		};
	}

	const connectionProblem = connectionFinding(endpoint, type);
	if (connectionProblem) return connectionProblem;

	const contexts = endpoint.contextKeys.length > 0 ? [endpoint.contextKeys.join(", ")] : [];
	const { conditions, scope } = endpointScope(contexts, integration);

	return {
		conditions,
		kind: "route",
		text: `${type.label} endpoint (${integration.identifier}), ${scope}`,
	};
}

/**
 * Why the endpoint can't use the connection it needs, or nothing when it can or needs none. The
 * worker loads a connection only when its context matches the trigger's exactly, as the endpoint's must.
 */
function connectionFinding(
	endpoint: ReachabilityEndpoint,
	type: EndpointType,
): RouteFinding | undefined {
	if (!type.needs || (type.needs === "connection_or_tenant" && endpoint.hasTenantId)) {
		return undefined;
	}

	const missing =
		type.needs === "connection"
			? `${type.provider} endpoint has no connection`
			: `${type.provider} endpoint has no connection or tenant ID`;
	const lookup: ConnectionLookup = endpoint.connection ?? { status: "missing" };

	switch (lookup.status) {
		case "unchecked":
			return {
				kind: "unverified",
				text: `${type.label} endpoint's connection wasn't checked (lookup limit)`,
			};
		case "failed":
			return { kind: "unverified", text: describeReadFailure("connections", lookup.failure) };
		case "missing":
			return { kind: "problem", text: missing };
		case "found": {
			const { connection } = lookup;
			if (!sameKeys(connection.contextKeys, endpoint.contextKeys)) {
				return {
					kind: "problem",
					text: `${type.provider} endpoint's connection only applies to ${triggersWithContext(connection.contextKeys)}`,
				};
			}

			// Without the endpoint's own tenant ID, MS Teams needs the connection's workspace.
			return type.needs === "connection_or_tenant" && !connection.hasWorkspaceId
				? { kind: "problem", text: missing }
				: undefined;
		}
	}
}

/**
 * Legacy `subscriber.channels` entries other than push tokens. Like push, one sends only through
 * the integration it's bound to; phone-based providers pick their integration by provider instead
 * (send-message-chat).
 */
function storedChannelFindings(ctx: RuleContext): RouteFinding[] {
	return ctx.input.subscriber.channels
		.filter((channel) => channel.deviceTokenCount === 0)
		.flatMap((channel) => storedChannelFinding(channel, ctx) ?? []);
}

function storedChannelFinding(
	channel: ReachabilitySubscriberChannel,
	{ active, input }: RuleContext,
): RouteFinding | undefined {
	const { providerId } = channel;
	const isPhoneBased = PHONE_BASED_CHAT_PROVIDERS.includes(providerId);
	const bound = isPhoneBased ? null : channel.integrationId;
	const integration = boundIntegration(active, providerId, bound);

	if (!integration) {
		const isChatProvider = input.integrations.some(
			(candidate) => candidate.channel === "chat" && candidate.providerId === providerId,
		);
		if (!channel.hasWebhookUrl || !(isChatProvider || bound)) return undefined;

		return {
			kind: "problem",
			text: bound
				? `${providerId} webhook is bound to an integration that is inactive or deleted`
				: `${providerId} webhook, but ${providerId} has no active integration`,
		};
	}

	if (isPhoneBased) {
		// A stored channel sends only to its own number; without one the worker fails it (CHAT_MISSING_PHONE_NUMBER).
		return channel.hasPhoneNumber
			? { conditions: [], kind: "route", text: `${providerId} phone number` }
			: {
					kind: "problem",
					text: `${providerId} channel has no phone number, and it replaces the phone number on file`,
				};
	}

	if (channel.hasWebhookUrl || channel.hasPhoneNumber) {
		return {
			conditions: [],
			kind: "route",
			text: `${providerId} ${channel.hasWebhookUrl ? "webhook" : "phone number"}`,
		};
	}

	return { kind: "problem", text: `${providerId} channel has no webhook URL` };
}

/**
 * The phone number on file, once per phone-based provider with an active integration. The worker
 * skips it for a provider with a stored channel, and for one with an endpoint matching the trigger
 * context (send-message-chat `getLegacyChatChannels`).
 */
function phoneOnFileFindings({ active, input }: RuleContext): RouteFinding[] {
	if (!input.subscriber.hasPhone) return [];

	const storedProviders = new Set(input.subscriber.channels.map((channel) => channel.providerId));
	const providers = new Set(
		active
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
				endpointIntegration(endpoint, active) !== undefined,
		);
		const route = `${providerId} to the phone number on file`;

		return {
			conditions: [],
			kind: "route",
			text: hasEndpoint
				? `${route}, when no ${providerId} endpoint matches the trigger context`
				: route,
		};
	});
}

function toolFinding(
	integration: ReachabilityIntegration,
	input: SubscriberReachabilityInput,
): RouteFinding {
	const isWebhook = integration.providerId === TOOL_WEBHOOK_PROVIDER;
	if (!isWebhook && !ENDPOINT_ROUTED_TOOL_PROVIDERS.includes(integration.providerId)) {
		return {
			conditions: [],
			kind: "route",
			text: `${integration.identifier} sends without a subscriber endpoint`,
		};
	}

	if (input.failures?.endpoints) {
		return {
			kind: "unverified",
			text: describeReadFailure("endpoints", input.failures.endpoints),
		};
	}

	const endpoints = input.endpoints.filter(
		(endpoint) =>
			endpoint.channel === "tool" &&
			endpoint.integrationIdentifier === integration.identifier,
	);

	if (endpoints.length > 0) {
		const contextFree = endpoints.filter(
			(endpoint) => endpoint.contextKeys.length === 0,
		).length;
		const { conditions, scope } = endpointScope(
			contextFree > 0 ? [] : endpoints.map((endpoint) => endpoint.contextKeys.join(", ")),
			integration,
		);

		return {
			conditions,
			kind: "route",
			text:
				contextFree > 0
					? `${contextFree} ${pluralize(contextFree, "endpoint")} for ${integration.identifier}, ${scope}`
					: `${integration.identifier}, ${scope}`,
		};
	}

	if (isWebhook) {
		return {
			kind: "unverified",
			text: `Couldn't tell whether the ${integration.identifier} webhook sends per subscriber (its routing mode isn't visible); if it does, this subscriber has no endpoint for it`,
		};
	}

	if (input.endpointsTruncated) {
		return { kind: "unverified", text: ENDPOINTS_READ_LIMIT_NOTE };
	}

	return { kind: "problem", text: `No ${integration.providerId} endpoint for this subscriber` };
}

/**
 * When an integration's endpoints are used (resolve-channel-endpoints): the trigger context must
 * match one endpoint's keys exactly, and an integration with rules must match them. `contexts`
 * holds each endpoint's joined keys; empty means context-free endpoints.
 */
function endpointScope(
	contexts: string[],
	integration: ReachabilityIntegration,
): { conditions: string[]; scope: string } {
	const conditions = [
		...(contexts.length > 0 ? [CONTEXT_REASON] : []),
		...(integration.hasRules ? [CONDITIONS_REASON] : []),
	];
	const context =
		contexts.length > 0
			? `only when the trigger context is exactly ${contexts.join(" or ")}`
			: CONTEXT_FREE_NOTE;

	return {
		conditions,
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
