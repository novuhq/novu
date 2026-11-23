/**
 * Which channels can reach one subscriber, and why not, from data the Novu API already returns.
 * The rules mirror the worker's send path (`apps/worker/src/app/workflow/usecases/send-message`),
 * so keep them in step when it changes. Pure: the tool in `tools/subscriber-reachability.ts`
 * reads the API and drops every credential before calling this.
 *
 * The result never carries a phone number, custom data or credential values, only whether
 * each is present.
 */

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
}

export interface SubscriberReachabilityInput {
	subscriber: ReachabilitySubscriber;
	integrations: ReachabilityIntegration[];
	preferences?: ReachabilityPreferences;
	criticalPreferences?: ReachabilityPreferences;
	endpoints: ReachabilityEndpoint[];
	connections: ReachabilityConnection[];
	failures?: Partial<Record<ReachabilitySource, ReadFailure>>;
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
}

export type SubscriberReachabilityResult =
	| {
			status: "found";
			environmentId: string | null;
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
	| { status: "ambiguous"; candidates: SubscriberReachabilityCandidate[] };

/** Chat providers that deliver to `subscriber.phone` (send-message-chat `PHONE_BASED_CHAT_PROVIDERS`). */
const PHONE_BASED_CHAT_PROVIDERS = ["whatsapp-business", "sendblue"];

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
	const failures = input.failures ?? {};
	const { subscriber } = input;
	const active = (channel: ReachabilityChannel) =>
		input.integrations.filter(
			(integration) => integration.active && integration.channel === channel,
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

	if (!failures.integrations && active("tool").length > 0) {
		verdicts.push(toolChannel(new Verdict("tool"), input, active("tool")));
	}

	for (const verdict of verdicts) {
		applyPreferences(verdict, input.preferences, failures.preferences);
	}

	return {
		channels: verdicts.map((verdict) => verdict.toResult()),
		checked: checkedSources(failures),
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
		verdict.details.push("Depends on integration conditions");
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
	const orphanProviders = new Set<string>();

	for (const channel of withTokens) {
		const integration = activeIntegrations.find(
			(candidate) =>
				candidate.providerId === channel.providerId &&
				(!channel.integrationIdentifier ||
					candidate.identifier === channel.integrationIdentifier),
		);
		if (integration) {
			devicesByProvider.set(
				channel.providerId,
				(devicesByProvider.get(channel.providerId) ?? 0) + channel.deviceTokenCount,
			);
		} else {
			orphanProviders.add(channel.providerId);
		}
	}

	for (const [providerId, count] of devicesByProvider) {
		verdict.details.push(`${count} ${count === 1 ? "device" : "devices"} on ${providerId}`);
	}

	const orphanReasons = [...orphanProviders].map(
		(providerId) => `Device tokens for ${providerId}, which has no active integration`,
	);

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
	const problems: string[] = [];
	const unverified: string[] = [];

	for (const endpoint of input.endpoints.filter((candidate) => candidate.channel === "chat")) {
		const check = checkEndpoint(endpoint, activeIntegrations, input);
		if (check.problem) problems.push(check.problem);
		else if (check.unverified) unverified.push(check.unverified);
		else if (check.conditional) conditionalRoutes.push(check.conditional);
		else routes.push(check.route);
		if (check.detail) verdict.details.push(check.detail);
	}

	for (const channel of input.subscriber.channels.filter(
		(candidate) => candidate.deviceTokenCount === 0,
	)) {
		const integration = activeIntegrations.find(
			(candidate) => candidate.providerId === channel.providerId,
		);
		if (!integration) {
			const isChatProvider = input.integrations.some(
				(candidate) =>
					candidate.channel === "chat" && candidate.providerId === channel.providerId,
			);
			if (isChatProvider && channel.hasWebhookUrl) {
				problems.push(
					`${channel.providerId} webhook, but ${channel.providerId} has no active integration`,
				);
			}
			continue;
		}

		if (channel.hasWebhookUrl || channel.hasPhoneNumber) {
			routes.push(
				`${channel.providerId} ${channel.hasWebhookUrl ? "webhook" : "phone number"}`,
			);
		} else {
			problems.push(`${channel.providerId} channel has no webhook URL`);
		}
	}

	if (input.subscriber.hasPhone) {
		for (const integration of activeIntegrations) {
			if (PHONE_BASED_CHAT_PROVIDERS.includes(integration.providerId)) {
				routes.push(`${integration.providerId} to the phone number on file`);
			}
		}
	}

	verdict.details.push(...routes, ...conditionalRoutes);

	if (routes.length > 0) {
		verdict.partial.push(...problems);
		verdict.details.push(...unverified);
		if (failures.endpoints) {
			verdict.details.push(describeReadFailure("endpoints", failures.endpoints));
		}

		return verdict;
	}

	if (failures.endpoints) {
		verdict.unknowns.push(describeReadFailure("endpoints", failures.endpoints));
	}
	verdict.unknowns.push(...unverified);

	if (conditionalRoutes.length > 0) {
		verdict.partial.push(...problems, "Only reachable for triggers with a matching context");
	} else if (verdict.unknowns.length === 0) {
		verdict.blockers.push(
			...(problems.length > 0
				? problems
				: ["No chat endpoint, webhook or phone-based chat integration"]),
		);
	}

	return verdict;
}

function checkEndpoint(
	endpoint: ReachabilityEndpoint,
	activeIntegrations: ReachabilityIntegration[],
	input: SubscriberReachabilityInput,
): {
	route: string;
	problem?: string;
	unverified?: string;
	conditional?: string;
	detail?: string;
} {
	const label = ENDPOINT_TYPE_LABELS[endpoint.type] ?? endpoint.type;
	const integration = activeIntegrations.find(
		(candidate) => candidate.identifier === endpoint.integrationIdentifier,
	);
	const route = `${label} endpoint (${endpoint.integrationIdentifier ?? endpoint.providerId})`;

	if (!integration) {
		return {
			problem: `${label} endpoint uses an inactive or missing integration (${endpoint.integrationIdentifier})`,
			route,
		};
	}

	const connection = endpoint.connectionIdentifier
		? input.connections.find(
				(candidate) => candidate.identifier === endpoint.connectionIdentifier,
			)
		: undefined;
	const connectionsFailure = input.failures?.connections;

	if (CONNECTION_TOKEN_TYPES.includes(endpoint.type) && !connection) {
		if (endpoint.connectionIdentifier && connectionsFailure) {
			return { route, unverified: describeReadFailure("connections", connectionsFailure) };
		}

		return { problem: `${label.split(" ")[0]} endpoint has no connection`, route };
	}

	if (
		MS_TEAMS_TYPES.includes(endpoint.type) &&
		!connection?.hasWorkspaceId &&
		!endpoint.hasTenantId
	) {
		if (endpoint.connectionIdentifier && connectionsFailure) {
			return { route, unverified: describeReadFailure("connections", connectionsFailure) };
		}

		return { problem: "MS Teams endpoint has no connection or tenant ID", route };
	}

	const detail = integration.hasRules
		? `${integration.identifier} depends on integration rules`
		: undefined;

	if (endpoint.contextKeys.length > 0) {
		return {
			conditional: `${route}, only when the trigger context is exactly ${endpoint.contextKeys.join(", ")}`,
			detail,
			route,
		};
	}

	return { detail, route };
}

/** Tool: endpoint-routed providers skip subscribers with no endpoint (send-message-tool). */
function toolChannel(
	verdict: Verdict,
	input: SubscriberReachabilityInput,
	activeIntegrations: ReachabilityIntegration[],
): Verdict {
	if (input.failures?.endpoints) {
		verdict.unknowns.push(describeReadFailure("endpoints", input.failures.endpoints));

		return verdict;
	}

	const identifiers = new Set(activeIntegrations.map((integration) => integration.identifier));
	const endpoints = input.endpoints.filter(
		(endpoint) =>
			endpoint.channel === "tool" &&
			endpoint.integrationIdentifier !== null &&
			identifiers.has(endpoint.integrationIdentifier),
	);

	if (endpoints.length === 0) {
		verdict.blockers.push("No tool endpoint for this subscriber");
	} else {
		verdict.details.push(
			`${endpoints.length} tool ${endpoints.length === 1 ? "endpoint" : "endpoints"}`,
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

	if (workflows.length === 0) {
		if (globalOffReason) verdict.blockers.push(globalOffReason);

		return;
	}

	if (off.length === workflows.length) {
		verdict.blockers.push(
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

	for (const source of ["connections"] as const) {
		const failure = failures[source];
		if (failure) notes.push(describeReadFailure(source, failure));
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
 * Masks subscriber channel credentials (`deviceTokens`, `webhookUrl`) anywhere in an API response:
 * one subscriber, a list, or either inside the `{ data }` envelope.
 */
export function maskSubscriberCredentials<T>(value: T): T {
	if (Array.isArray(value)) {
		return value.map((item) => maskSubscriberCredentials(item)) as T;
	}

	if (!value || typeof value !== "object") {
		return value;
	}

	const masked: Record<string, unknown> = {};
	for (const [key, entry] of Object.entries(value)) {
		if (key === "deviceTokens" && Array.isArray(entry)) {
			masked[key] = entry.map((token) =>
				typeof token === "string" ? maskCredentialValue(token) : token,
			);
		} else if (key === "webhookUrl" && typeof entry === "string") {
			masked[key] = maskCredentialValue(entry);
		} else {
			masked[key] = maskSubscriberCredentials(entry);
		}
	}

	return masked as T;
}
