/*
 * What the agent tools hand the model. The API returns the whole agent: the managed runtime's system
 * prompt, the access rule, provider-side ids and internal user and organization ids. Hosted clients
 * and the Copilot get the same allowlisted shape instead, built here before the result exists.
 */

import { asRecord, asString, SECRET_LIKE_SEGMENT } from "./activity-format";

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
	/** With `[redacted]` in place of credentials, secret-looking path segments, query string and fragment. */
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
	/** The agents list, where agents are created, as a path under `/env/<environment>`. */
	dashboardPath: string;
	next: string | null;
	previous: string | null;
	totalCount?: number;
	/** The API stopped counting: `totalCount` is a lower bound. */
	totalCountCapped?: boolean;
	planUsage?: { used?: number; limit?: number };
};

function asBoolean(value: unknown): boolean | undefined {
	return typeof value === "boolean" ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" ? value : undefined;
}

/** Drops keys whose value is `undefined`, so the JSON the model reads stays short. */
export function compact<T extends Json>(value: T): T {
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

/** What `redactUrl` puts in place of a URL's secrets; `update_agent` refuses a bridge URL holding it. */
export const REDACTED_MARK = "[redacted]";

/** What `redactUrl` returns for a URL it can't read; `update_agent` refuses it too. */
export const INVALID_URL_MARK = "[invalid URL]";

/**
 * A URL with `[redacted]` in place of its user info, path parameters (`;jsessionid=…`), secret-looking
 * path segments, query string and fragment, any of which can carry a token. The marks show the URL is
 * incomplete, so it isn't saved back as the whole one. Bridge URLs may be saved without a scheme, so
 * one without stays without.
 */
export function redactUrl(value: unknown): string | undefined {
	const raw = asString(value)?.trim();
	if (!raw) return undefined;

	const hasScheme = /^[a-z][a-z\d+.-]*:\/\//i.test(raw);
	let url: URL;
	try {
		url = new URL(hasScheme ? raw : `https://${raw}`);
	} catch {
		return INVALID_URL_MARK;
	}

	const [pathname, ...pathParameters] = url.pathname.split(";");
	const path =
		pathname === "/"
			? ""
			: pathname
					.split("/")
					.map((segment) => (SECRET_LIKE_SEGMENT.test(segment) ? REDACTED_MARK : segment))
					.join("/");
	const userInfo = url.username || url.password ? `${REDACTED_MARK}@` : "";
	const hidden = [
		pathParameters.length > 0 ? `;${REDACTED_MARK}` : "",
		url.search ? `?${REDACTED_MARK}` : "",
		url.hash ? `#${REDACTED_MARK}` : "",
	].join("");
	const origin = `${userInfo}${url.host}${path}${hidden}`;

	return hasScheme ? `${url.protocol}//${origin}` : origin;
}

const AGENTS_DASHBOARD_PATH = "/agents";

/** The dashboard's agent page, as a path under `/env/<environment>`. */
export function agentDashboardPath(identifier: string): string {
	return `${AGENTS_DASHBOARD_PATH}/${encodeURIComponent(identifier)}`;
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
		dashboardPath: AGENTS_DASHBOARD_PATH,
		data: rows.flatMap((row) => toAgentSummary(row) ?? []),
		next: asString(root?.next) ?? null,
		planUsage: planUsage
			? compact({ limit: asNumber(planUsage.limit), used: asNumber(planUsage.used) })
			: undefined,
		previous: asString(root?.previous) ?? null,
		totalCount: asNumber(root?.totalCount),
		totalCountCapped: root?.totalCountCapped === true ? true : undefined,
	});
}
