import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types/index";
import { asRecord, asString } from "../utils/activity-format";
import {
	type ConnectionLookup,
	ENDPOINTS_READ_LIMIT,
	type ReachabilityConnection,
	type ReachabilityEndpoint,
	type ReachabilityIntegration,
	type ReachabilityPreferences,
	type ReachabilitySubscriber,
	type ReadFailure,
	type ReadFailures,
	type SubscriberReachabilityResult,
} from "../utils/reachability-model";
import {
	computeSubscriberReachability,
	subscriberCandidate,
} from "../utils/subscriber-reachability";
import type { ToolAccessors } from "../utils/tool-accessors";
import { type ApiCallResult, type ToolContext, ToolFactory } from "../utils/tool-factory";
import { SUBSCRIBER_REACHABILITY_TOOL_NAMES } from "./tool-names";

const [SUBSCRIBER_REACHABILITY_TOOL_NAME] = SUBSCRIBER_REACHABILITY_TOOL_NAMES;

const READ_ONLY = { destructiveHint: false, openWorldHint: false, readOnlyHint: true } as const;

const SEARCH_LIMIT = 10;
const MAX_CONNECTION_LOOKUPS = 10;

const MISSING_IDENTIFIER =
	"Error: Give one of subscriberId, email, phone or name, with a non-blank value, to find the subscriber.";

type Json = Record<string, unknown>;
type FailedCall = Extract<ApiCallResult, { ok: false }>;

const reachabilitySchema = z.object({
	email: z
		.string()
		.optional()
		.describe("Email address, matched exactly; trimmed and lowercase retries are automatic"),
	name: z
		.string()
		.optional()
		.describe("Name, matched case-insensitively against part of the first and last name"),
	phone: z
		.string()
		.optional()
		.describe(
			"Phone number, matched exactly; a retry without spaces, dashes and brackets is automatic",
		),
	subscriberId: z.string().optional().describe("subscriberId; wins over the other fields"),
});

type ReachabilityInput = z.infer<typeof reachabilitySchema>;

/**
 * `get_subscriber_reachability`: one verdict per channel for one subscriber, built from the
 * profile, integrations, preferences, push tokens and chat endpoints. Credentials and the phone
 * number are dropped here, before the rules run, so they never reach the result.
 */
export function registerSubscriberReachabilityTool(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		annotations: READ_ONLY,
		description:
			"Check which channels (email, in-app, SMS, push, chat, tool) can reach one subscriber and, for each one that can't, why: missing address or push token, no active integration, preferences, or a chat endpoint without a connection. Give one of subscriberId, email, phone or name; several matches return candidates to choose from. Covers setup, not delivery history: use the notification or workflow-run tools for what was sent. Never returns phone numbers, custom data or credentials.",
		handler: async (rawInput, context) => {
			const input = withoutBlankValues(rawInput);
			if (!input.subscriberId && !input.email && !input.phone && !input.name) {
				return ToolFactory.errorResult({ message: MISSING_IDENTIFIER, status: 400 });
			}

			const lookup = await findSubscriber(input, context);
			if (lookup.kind === "error") {
				return lookupError(lookup.failure);
			}
			if (lookup.kind === "done") {
				return reachabilityResult(lookup.result);
			}

			return reachabilityResult(await checkReachability(lookup.subscriber, context));
		},
		name: SUBSCRIBER_REACHABILITY_TOOL_NAME,
		schema: reachabilitySchema,
		title: "Get subscriber reachability",
	});
}

type Lookup =
	| { kind: "found"; subscriber: Json }
	| { kind: "done"; result: SubscriberReachabilityResult }
	| { kind: "error"; failure: FailedCall };

async function findSubscriber(input: ReachabilityInput, context: ToolContext): Promise<Lookup> {
	if (input.subscriberId) {
		const response = await read(
			context,
			`/v2/subscribers/${encodeURIComponent(input.subscriberId)}`,
		);
		if (response.ok) {
			return { kind: "found", subscriber: asRecord(response.data) ?? {} };
		}

		return response.status === 404
			? notFound("subscriberId", input.subscriberId)
			: { failure: response, kind: "error" };
	}

	const { field, values } = searchAttempts(input);
	for (const value of values) {
		const query = new URLSearchParams({ [field]: value, limit: String(SEARCH_LIMIT) });
		// The page keeps its envelope: `next` sits beside `data`.
		const response = await read(context, `/v2/subscribers?${query.toString()}`, {
			unwrapData: false,
		});
		if (!response.ok) {
			return { failure: response, kind: "error" };
		}

		const page = asRecord(response.data);
		const matches = asArray(page?.data);
		if (matches.length === 1) {
			return { kind: "found", subscriber: matches[0] };
		}
		if (matches.length > 1) {
			return {
				kind: "done",
				result: {
					candidates: matches.map((match) => subscriberCandidate(toSubscriber(match))),
					hasMore: Boolean(page?.next) || matches.length >= SEARCH_LIMIT,
					status: "ambiguous",
				},
			};
		}
	}

	// The phone number stays out of the result, even the one the caller searched for.
	return notFound(field, field === "phone" ? undefined : values[0]);
}

/**
 * A blank value would become an empty filter, which the API ignores and answers with the
 * environment's first subscribers; treat it as not given. The subscriberId is trimmed for the lookup.
 */
function withoutBlankValues(input: ReachabilityInput): ReachabilityInput {
	const given = (value?: string) => (value?.trim() ? value : undefined);

	return {
		email: given(input.email),
		name: given(input.name),
		phone: given(input.phone),
		subscriberId: input.subscriberId?.trim() || undefined,
	};
}

function searchAttempts(input: ReachabilityInput): {
	field: "email" | "phone" | "name";
	values: string[];
} {
	if (input.email) {
		const trimmed = input.email.trim();

		return { field: "email", values: unique([input.email, trimmed, trimmed.toLowerCase()]) };
	}
	if (input.phone) {
		return {
			field: "phone",
			values: unique([input.phone, input.phone.replace(/[\s\-().]/g, "")]),
		};
	}

	return { field: "name", values: [(input.name ?? "").trim()] };
}

function notFound(field: string, value?: string): Lookup {
	return {
		kind: "done",
		result: {
			searched: value === undefined ? { field } : { field, value },
			status: "not_found",
		},
	};
}

async function checkReachability(
	rawSubscriber: Json,
	context: ToolContext,
): Promise<SubscriberReachabilityResult> {
	const subscriber = toSubscriber(rawSubscriber);
	const subscriberId = encodeURIComponent(subscriber.subscriberId);
	const endpointsQuery = new URLSearchParams({
		limit: String(ENDPOINTS_READ_LIMIT),
		subscriberId: subscriber.subscriberId,
	});

	const [integrations, preferences, criticalPreferences, endpoints] = await Promise.all([
		read(context, "/v1/integrations"),
		read(context, `/v2/subscribers/${subscriberId}/preferences`),
		read(context, `/v2/subscribers/${subscriberId}/preferences?criticality=critical`),
		// The page keeps its envelope: `next` says whether more endpoints exist.
		read(context, `/v1/channel-endpoints?${endpointsQuery.toString()}`, { unwrapData: false }),
	]);

	const endpointsPage = endpoints.ok ? asRecord(endpoints.data) : undefined;
	const rawEndpoints = asArray(endpointsPage?.data);
	const connections = await lookUpConnections(context, rawEndpoints);

	const failures: ReadFailures = {};
	const sources = { criticalPreferences, endpoints, integrations, preferences };
	for (const [source, response] of Object.entries(sources) as Array<
		[keyof ReadFailures, ApiCallResult]
	>) {
		if (!response.ok) failures[source] = toReadFailure(response);
	}

	return computeSubscriberReachability({
		criticalPreferences: criticalPreferences.ok
			? toPreferences(criticalPreferences.data)
			: undefined,
		endpoints: rawEndpoints.map((raw) => toEndpoint(raw, connections)),
		// One page of endpoints: what's left over is "not checked".
		endpointsTruncated: Boolean(endpointsPage?.next),
		failures,
		integrations: integrations.ok
			? asArray(integrations.data)
					.filter((integration) => inEnvironment(integration, subscriber.environmentId))
					.map(toIntegration)
			: [],
		preferences: preferences.ok ? toPreferences(preferences.data) : undefined,
		subscriber,
	});
}

/** Whether an integration belongs to the subscriber's environment; a side without one matches any. */
function inEnvironment(integration: Json, environmentId: string | null | undefined): boolean {
	return (
		!environmentId ||
		!integration._environmentId ||
		integration._environmentId === environmentId
	);
}

/** One lookup per connection the endpoints link to, by identifier; those past the cap aren't read. */
async function lookUpConnections(
	context: ToolContext,
	rawEndpoints: Json[],
): Promise<Map<string, ConnectionLookup>> {
	const identifiers = unique(
		rawEndpoints.flatMap((raw) => asString(raw.connectionIdentifier) ?? []),
	);
	const lookups = await Promise.all(
		identifiers.map((identifier, index): Promise<ConnectionLookup> | ConnectionLookup =>
			index < MAX_CONNECTION_LOOKUPS
				? lookUpConnection(context, identifier)
				: { status: "unchecked" },
		),
	);

	return new Map(identifiers.map((identifier, index) => [identifier, lookups[index]]));
}

/** A deleted connection (404) is a finding ("no connection"), not a failed read. */
async function lookUpConnection(
	context: ToolContext,
	identifier: string,
): Promise<ConnectionLookup> {
	const response = await read(
		context,
		`/v1/channel-connections/${encodeURIComponent(identifier)}`,
	);
	if (response.ok) {
		return { connection: toConnection(asRecord(response.data) ?? {}), status: "found" };
	}

	return response.status === 404
		? { status: "missing" }
		: { failure: toReadFailure(response), status: "failed" };
}

/** One GET that never throws: a network error comes back as a failed call with status 0. */
async function read(
	context: ToolContext,
	endpoint: string,
	options: { unwrapData?: boolean } = {},
): Promise<ApiCallResult> {
	try {
		return await ToolFactory.callApi(context, { endpoint, method: "GET", ...options });
	} catch (error) {
		return {
			errorText: error instanceof Error ? error.message : "Request failed",
			ok: false,
			status: 0,
		};
	}
}

function toReadFailure(response: FailedCall): ReadFailure {
	return response.status ? { status: response.status } : {};
}

function lookupError(failure: FailedCall): ApiResponse {
	return ToolFactory.errorResult({
		message: `Error: Failed to look up the subscriber. Status: ${failure.status || "network error"}, Message: ${failure.errorText}`,
		retryAfter: failure.retryAfter,
		status: failure.status || undefined,
	});
}

function reachabilityResult(result: SubscriberReachabilityResult): ApiResponse {
	return {
		content: [{ text: JSON.stringify(result), type: "text" as const }],
		structuredContent: { reachability: result },
	};
}

/** Keeps only what the rules read: credential values and the phone number become presence flags. */
function toSubscriber(raw: Json): ReachabilitySubscriber {
	return {
		channels: asArray(raw.channels).map((channel) => {
			const credentials = asRecord(channel.credentials) ?? {};
			const deviceTokens = Array.isArray(credentials.deviceTokens)
				? credentials.deviceTokens
				: [];

			return {
				deviceTokenCount: deviceTokens.filter((token) => typeof token === "string" && token)
					.length,
				hasPhoneNumber: Boolean(credentials.phoneNumber),
				hasWebhookUrl: Boolean(credentials.webhookUrl),
				integrationId: asString(channel._integrationId) ?? null,
				providerId: String(channel.providerId ?? ""),
			};
		}),
		email: asString(raw.email) ?? null,
		environmentId: asString(raw._environmentId) ?? null,
		firstName: asString(raw.firstName) ?? null,
		hasPhone: typeof raw.phone === "string" && raw.phone.trim().length > 0,
		isOnline: typeof raw.isOnline === "boolean" ? raw.isOnline : null,
		lastName: asString(raw.lastName) ?? null,
		lastOnlineAt: asString(raw.lastOnlineAt) ?? null,
		subscriberId: String(raw.subscriberId ?? ""),
	};
}

function toIntegration(raw: Json): ReachabilityIntegration {
	const rules = asRecord(raw.rules);

	return {
		active: raw.active === true,
		channel: String(raw.channel ?? ""),
		hasConditions: Array.isArray(raw.conditions) && raw.conditions.length > 0,
		hasRules: Boolean(rules && Object.keys(rules).length > 0),
		id: String(raw._id ?? ""),
		identifier: String(raw.identifier ?? ""),
		primary: raw.primary === true,
		providerId: String(raw.providerId ?? ""),
	};
}

function toEndpoint(raw: Json, connections: Map<string, ConnectionLookup>): ReachabilityEndpoint {
	const connectionIdentifier = asString(raw.connectionIdentifier);

	return {
		channel: asString(raw.channel) ?? null,
		connection: connectionIdentifier ? (connections.get(connectionIdentifier) ?? null) : null,
		contextKeys: contextKeysOf(raw),
		hasTenantId: Boolean(asRecord(raw.endpoint)?.tenantId),
		integrationIdentifier: asString(raw.integrationIdentifier) ?? null,
		providerId: asString(raw.providerId) ?? null,
		type: String(raw.type ?? ""),
	};
}

function toConnection(raw: Json): ReachabilityConnection {
	return {
		contextKeys: contextKeysOf(raw),
		hasWorkspaceId: Boolean(asRecord(raw.workspace)?.id),
	};
}

/** Endpoints and connections stored before contexts have no `contextKeys`; that's the empty context. */
function contextKeysOf(raw: Json): string[] {
	return Array.isArray(raw.contextKeys)
		? raw.contextKeys.filter((key): key is string => typeof key === "string")
		: [];
}

function toPreferences(data: unknown): ReachabilityPreferences | undefined {
	return asRecord(data) as ReachabilityPreferences | undefined;
}

function asArray(value: unknown): Json[] {
	return Array.isArray(value)
		? value.filter((item): item is Json => Boolean(asRecord(item)))
		: [];
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}
