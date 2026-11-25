/*
 * What the agent tools hand the model. The API returns the whole agent: the managed runtime's system
 * prompt, the access rule, provider-side ids and internal user and organization ids. Hosted clients
 * and the Copilot get the same allowlisted shape instead, built here before the result exists.
 */

type Json = Record<string, unknown>;

/** One agent, as the agent tools return it. */
export type AgentSummary = {
	identifier: string;
	name?: string;
	description?: string;
	active?: boolean;
	runtime?: string;
	behavior?: {
		acknowledgeOnReceived?: boolean;
		reactionOnResolved?: string | null;
		subscriberAccess?: string;
		replyPolicy?: string;
		/** Whether an access rule limits who may message the agent; the rule itself stays out. */
		hasAccessRule?: boolean;
	};
	/** Without credentials, query string or fragment. */
	bridgeUrl?: string;
	devBridgeUrl?: string;
	devBridgeActive?: boolean;
	managedRuntime?: {
		providerId?: string;
		integrationId?: string;
		tools?: string[];
		mcpServers?: string[];
	};
	/** The agent's channels, on list results only. */
	channels?: AgentChannelSummary[];
	exceedsPlanLimit?: boolean;
	createdAt?: string;
	updatedAt?: string;
	/** The agent's page, as a path under `/env/<environment>`. */
	dashboardPath: string;
};

export type AgentChannelSummary = {
	integrationIdentifier?: string;
	name?: string;
	providerId?: string;
	channel?: string;
	active?: boolean;
};

export type AgentList = {
	data: AgentSummary[];
	next: string | null;
	previous: string | null;
	totalCount?: number;
	planUsage?: { used?: number; limit?: number };
};

function asRecord(value: unknown): Json | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Json)
		: undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" ? value : undefined;
}

/** Drops keys whose value is `undefined`, so the JSON the model reads stays short. */
function compact<T extends Json>(value: T): T {
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== undefined),
	) as T;
}

/** `{ data: … }` from a single-object response, or the object itself. */
export function unwrapRecord(payload: unknown): Json | undefined {
	const root = asRecord(payload);
	const data = asRecord(root?.data);

	return data ?? root;
}

/**
 * A URL without its user info, query string or fragment, any of which can carry a token. Bridge URLs
 * may be saved without a scheme, so one without stays without.
 */
export function redactUrl(value: unknown): string | undefined {
	const raw = asString(value)?.trim();
	if (!raw) return undefined;

	const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw);
	let url: URL;
	try {
		url = new URL(hasScheme ? raw : `https://${raw}`);
	} catch {
		return "[invalid URL]";
	}

	const path = url.pathname === "/" ? "" : url.pathname;

	return hasScheme ? `${url.protocol}//${url.host}${path}` : `${url.host}${path}`;
}

/** The dashboard's agent page, as a path under `/env/<environment>`. */
export function agentDashboardPath(identifier: string): string {
	return `/agents/${encodeURIComponent(identifier)}`;
}

function toNames(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;

	return value.flatMap((entry) => {
		const name = asString(asRecord(entry)?.name);

		return name ? [name] : [];
	});
}

function toChannel(value: unknown): AgentChannelSummary | undefined {
	const record = asRecord(value);
	if (!record) return undefined;

	return compact({
		active: asBoolean(record.active),
		channel: asString(record.channel),
		integrationIdentifier: asString(record.identifier),
		name: asString(record.name),
		providerId: asString(record.providerId),
	});
}

/** The allowlisted agent, or `undefined` when the record has no identifier. */
export function toAgentSummary(value: unknown): AgentSummary | undefined {
	const record = asRecord(value);
	const identifier = asString(record?.identifier);
	if (!record || !identifier) return undefined;

	const behavior = asRecord(record.behavior);
	const managed = asRecord(record.managedRuntime);
	const channels = Array.isArray(record.integrations)
		? record.integrations.flatMap((entry) => toChannel(entry) ?? [])
		: undefined;

	return compact({
		active: asBoolean(record.active),
		behavior: behavior
			? compact({
					acknowledgeOnReceived: asBoolean(behavior.acknowledgeOnReceived),
					hasAccessRule: behavior.accessRule != null ? true : undefined,
					reactionOnResolved:
						behavior.reactionOnResolved === null
							? null
							: asString(behavior.reactionOnResolved),
					replyPolicy: asString(behavior.replyPolicy),
					subscriberAccess: asString(behavior.subscriberAccess),
				})
			: undefined,
		bridgeUrl: redactUrl(record.bridgeUrl),
		channels,
		createdAt: asString(record.createdAt),
		dashboardPath: agentDashboardPath(identifier),
		description: asString(record.description),
		devBridgeActive: asBoolean(record.devBridgeActive),
		devBridgeUrl: redactUrl(record.devBridgeUrl),
		exceedsPlanLimit: asBoolean(record.exceedsPlanLimit),
		identifier,
		managedRuntime: managed
			? compact({
					integrationId: asString(managed.integrationId),
					mcpServers: toNames(managed.mcpServers),
					providerId: asString(managed.providerId),
					tools: toNames(managed.tools),
				})
			: undefined,
		name: asString(record.name),
		runtime: asString(record.runtime),
		updatedAt: asString(record.updatedAt),
	});
}

/** The allowlisted page of `GET /v1/agents`, with its cursors. */
export function toAgentList(payload: unknown): AgentList {
	const root = asRecord(payload);
	const rows = Array.isArray(root?.data) ? root.data : [];
	const planUsage = asRecord(root?.planUsage);

	return compact({
		data: rows.flatMap((row) => toAgentSummary(row) ?? []),
		next: asString(root?.next) ?? null,
		planUsage: planUsage
			? compact({ limit: asNumber(planUsage.limit), used: asNumber(planUsage.used) })
			: undefined,
		previous: asString(root?.previous) ?? null,
		totalCount: asNumber(root?.totalCount),
	});
}
