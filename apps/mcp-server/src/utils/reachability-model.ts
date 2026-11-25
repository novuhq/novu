/**
 * The subscriber reachability model: the rules' input and result types, the verdict a rule builds,
 * and the wording the rule modules share. It imports nothing, so the rule modules don't import
 * each other.
 */

export type ReachabilityChannel = "email" | "in_app" | "sms" | "push" | "chat" | "tool";

export type ReachabilityState = "reachable" | "partly" | "blocked" | "unknown";

/** What the verdicts are read from, in the order the result's `checked` lists them. */
export const REACHABILITY_SOURCES = [
	"integrations",
	"preferences",
	"criticalPreferences",
	"endpoints",
	"connections",
] as const;

export type ReachabilitySource = (typeof REACHABILITY_SOURCES)[number];

/** The tool reads one page of this many endpoints; more may exist. */
export const ENDPOINTS_READ_LIMIT = 100;

export interface ReadFailure {
	/** HTTP status of the failed read; absent for network errors. */
	status?: number;
}

/** Reads that fail as a whole; connection lookups fail one at a time (`ConnectionLookup`). */
export type ReadFailures = Partial<Record<Exclude<ReachabilitySource, "connections">, ReadFailure>>;

export interface ReachabilitySubscriberChannel {
	providerId: string;
	/** The integration the channel is bound to (`_integrationId`); the worker sends only through it. */
	integrationId?: string | null;
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

export interface ReachabilityConnection {
	hasWorkspaceId: boolean;
	contextKeys: string[];
}

export type ConnectionLookup =
	| { status: "found"; connection: ReachabilityConnection }
	| { status: "missing" } // 404
	| { status: "failed"; failure: ReadFailure }
	| { status: "unchecked" }; // past MAX_CONNECTION_LOOKUPS

export interface ReachabilityEndpoint {
	channel: string | null;
	providerId: string | null;
	integrationIdentifier: string | null;
	/** The lookup of the connection the endpoint links to; null when it links to none. */
	connection: ConnectionLookup | null;
	contextKeys: string[];
	type: string;
	hasTenantId: boolean;
}

export interface SubscriberReachabilityInput {
	subscriber: ReachabilitySubscriber;
	integrations: ReachabilityIntegration[];
	preferences?: ReachabilityPreferences;
	criticalPreferences?: ReachabilityPreferences;
	endpoints: ReachabilityEndpoint[];
	failures?: ReadFailures;
	/** More endpoints may exist than the one page the tool read, so they aren't reported as missing. */
	endpointsTruncated?: boolean;
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

export const CONDITIONS_REASON = "Only for triggers that match the integration's conditions";

export const CHANNEL_LABELS: Record<ReachabilityChannel, string> = {
	chat: "chat",
	email: "email",
	in_app: "in-app",
	push: "push",
	sms: "SMS",
	tool: "tool",
};

export const SOURCE_LABELS: Record<ReachabilitySource, string> = {
	connections: "channel connections",
	criticalPreferences: "critical workflows",
	endpoints: "channel endpoints",
	integrations: "integrations",
	preferences: "preferences",
};

export function describeReadFailure(source: ReachabilitySource, failure: ReadFailure): string {
	const label = SOURCE_LABELS[source];
	if (failure.status === undefined) return `Couldn't check ${label} (request failed)`;
	if (failure.status === 403) return `Couldn't check ${label} (403: missing permission)`;
	if (failure.status === 401) return `Couldn't check ${label} (401: not authorized)`;

	return `Couldn't check ${label} (${failure.status})`;
}

export function pluralize(count: number, word: string): string {
	return count === 1 ? word : `${word}s`;
}
