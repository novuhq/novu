/**
 * Which channels can reach one subscriber, and why not, from data the Novu API already returns.
 * The rules mirror the worker's send path (`apps/worker/src/app/workflow/usecases/send-message`),
 * so keep them in step when it changes. Pure: the tool in `tools/subscriber-reachability.ts`
 * reads the API and drops every credential before calling this.
 *
 * Each channel has one rule in `CHANNEL_RULES`; chat and tool routes are in `reachability-routes.ts`
 * and preferences in `reachability-preferences.ts`.
 *
 * The result never carries a phone number, custom data or credential values, only whether
 * each is present.
 */

import { applyPreferences, preferenceNotes } from "./reachability-preferences";
import { chatChannel, connectionLookup, toolChannel, toolInUse } from "./reachability-routes";
import {
	CHANNEL_LABELS,
	CONDITIONS_REASON,
	describeReadFailure,
	SOURCE_LABELS,
} from "./reachability-text";

export { describeReadFailure } from "./reachability-text";

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

/** Reads that fail as a whole; connection lookups fail one at a time (`ConnectionLookup`). */
export type ReadFailures = Partial<Record<Exclude<ReachabilitySource, "connections">, ReadFailure>>;

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
	hasWorkspaceId: boolean;
	contextKeys: string[];
}

export type ConnectionLookup =
	| { status: "found"; connection: ReachabilityConnection }
	| { status: "missing" } // 404
	| { status: "failed"; failure: ReadFailure }
	| { status: "unchecked" }; // past MAX_CONNECTION_LOOKUPS

export interface SubscriberReachabilityInput {
	subscriber: ReachabilitySubscriber;
	integrations: ReachabilityIntegration[];
	preferences?: ReachabilityPreferences;
	criticalPreferences?: ReachabilityPreferences;
	endpoints: ReachabilityEndpoint[];
	/** One lookup per connection the endpoints reference, by connection identifier. */
	connections: Record<string, ConnectionLookup>;
	failures?: ReadFailures;
	/** What the tool's read caps left out, so it isn't reported as missing setup. */
	limits?: {
		/** More endpoints may exist than the one page that was read. */
		endpointsTruncated?: boolean;
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

/** What every channel rule reads: the input, and the channel's integrations that workflows can send through. */
export interface RuleContext {
	input: SubscriberReachabilityInput;
	active: ReachabilityIntegration[];
}

interface ChannelRule {
	channel: ReachabilityChannel;
	/** Runs before the integrations check, so what it finds stands whatever the integrations say. */
	precheck?: (v: Verdict, ctx: RuleContext) => void;
	/** Whether the channel is reported at all; it is when this is absent. */
	applies?: (ctx: RuleContext) => boolean;
	/** Runs only when the channel has an active integration. */
	evaluate?: (v: Verdict, ctx: RuleContext) => void;
}

/** One rule per channel, in the order the result lists them. */
const CHANNEL_RULES: ChannelRule[] = [
	{
		channel: "email",
		evaluate: primaryIntegration,
		precheck: requireDestination("No email address", (subscriber) => Boolean(subscriber.email)),
	},
	{ channel: "in_app", precheck: inboxPresence },
	{
		channel: "sms",
		evaluate: primaryIntegration,
		precheck: requireDestination("No phone number", (subscriber) => subscriber.hasPhone),
	},
	{ channel: "push", evaluate: pushChannel },
	{ channel: "chat", evaluate: chatChannel },
	{ applies: toolInUse, channel: "tool", evaluate: toolChannel },
];

/** Integrations workflows never send through (SelectIntegration `isHiddenFromWorkflows`). */
const HIDDEN_FROM_WORKFLOWS_PROVIDERS = ["agent-email-inbox"];

const SOURCES: ReachabilitySource[] = [
	"integrations",
	"preferences",
	"criticalPreferences",
	"endpoints",
	"connections",
];

/** One channel's verdict while it is being built: blockers win over unknowns, unknowns over partial gaps. */
export class Verdict {
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

export function computeSubscriberReachability(
	input: SubscriberReachabilityInput,
): Extract<SubscriberReachabilityResult, { status: "found" }> {
	const { subscriber } = input;

	return {
		channels: CHANNEL_RULES.flatMap((rule) => runRule(rule, input)?.toResult() ?? []),
		checked: checkedSources(input),
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

/** The channel's verdict, or nothing when the rule doesn't apply to this subscriber. */
function runRule(rule: ChannelRule, input: SubscriberReachabilityInput): Verdict | undefined {
	const ctx: RuleContext = {
		active: input.integrations.filter(
			(integration) =>
				integration.active &&
				integration.channel === rule.channel &&
				!HIDDEN_FROM_WORKFLOWS_PROVIDERS.includes(integration.providerId),
		),
		input,
	};
	if (rule.applies && !rule.applies(ctx)) return undefined;

	const v = new Verdict(rule.channel);
	rule.precheck?.(v, ctx);
	if (hasActiveIntegration(v, ctx)) rule.evaluate?.(v, ctx);
	applyPreferences(v, input);

	return v;
}

/** An unreadable integration list leaves the channel unknown, and an empty one blocks it. */
function hasActiveIntegration(v: Verdict, { active, input }: RuleContext): boolean {
	const failure = input.failures?.integrations;
	if (failure) {
		v.unknowns.push(describeReadFailure("integrations", failure));

		return false;
	}

	if (active.length === 0) {
		v.blockers.push(`No active ${CHANNEL_LABELS[v.channel]} integration`);

		return false;
	}

	return true;
}

/** Email and SMS block without the subscriber's address, whatever the integrations say. */
function requireDestination(
	missing: string,
	hasDestination: (subscriber: ReachabilitySubscriber) => boolean,
): (v: Verdict, ctx: RuleContext) => void {
	return (v, { input }) => {
		if (!hasDestination(input.subscriber)) v.blockers.push(missing);
	};
}

/** Email and SMS send through the environment's active primary integration (SelectIntegration). */
function primaryIntegration(v: Verdict, { active }: RuleContext): void {
	const primary = active.find((integration) => integration.primary);
	if (primary) {
		v.details.push(`Sends with ${primary.providerId}`);
	} else if (active.some((integration) => integration.hasConditions || integration.hasRules)) {
		// Without a primary to fall back to, a trigger that matches no integration's conditions isn't sent.
		v.partial.push(CONDITIONS_REASON);
	} else {
		v.blockers.push(`No primary ${CHANNEL_LABELS[v.channel]} integration`);
	}
}

/** In-app: when the subscriber last used the Inbox, whatever the integrations say. */
function inboxPresence(v: Verdict, { input: { subscriber } }: RuleContext): void {
	if (subscriber.isOnline) v.details.push("Online now");
	else if (subscriber.lastOnlineAt) v.details.push(`Last seen ${subscriber.lastOnlineAt}`);
	else v.details.push("Never opened the Inbox");
}

/** Push: device tokens on `subscriber.channels` for a provider with an active integration (send-message-push). */
function pushChannel(v: Verdict, { active, input }: RuleContext): void {
	const withTokens = input.subscriber.channels.filter((channel) => channel.deviceTokenCount > 0);
	const devicesByProvider = new Map<string, number>();
	const orphans = new Set<string>();

	for (const channel of withTokens) {
		// The worker sends through the integration the channel is bound to, never a sibling of the same provider.
		const integration = active.find(
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
		v.details.push(`${count} ${count === 1 ? "device" : "devices"} on ${providerId}`);
	}

	const orphanReasons = [...orphans];

	if (devicesByProvider.size > 0) {
		v.partial.push(...orphanReasons);
	} else if (orphanReasons.length > 0) {
		v.blockers.push(...orphanReasons);
	} else {
		v.blockers.push("No push device tokens");
	}
}

/** The sources the verdicts rest on: each read that succeeded, and connections once every lookup settled. */
function checkedSources(input: SubscriberReachabilityInput): string[] {
	const failures = input.failures ?? {};
	const connectionIds = input.endpoints.flatMap((endpoint) =>
		endpoint.connectionIdentifier ? [endpoint.connectionIdentifier] : [],
	);
	// Found or gone (404) both settle a connection; a failed or skipped lookup leaves it unchecked.
	const connectionsRead =
		connectionIds.length > 0 &&
		connectionIds.every((identifier) =>
			["found", "missing"].includes(connectionLookup(input, identifier).status),
		);

	return [
		"profile",
		...SOURCES.filter((source) =>
			source === "connections" ? connectionsRead : !failures[source],
		).map((source) => SOURCE_LABELS[source]),
	];
}
