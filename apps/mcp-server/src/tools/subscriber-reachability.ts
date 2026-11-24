import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types/index";
import {
	computeSubscriberReachability,
	type ReachabilityConnection,
	type ReachabilityEndpoint,
	type ReachabilityIntegration,
	type ReachabilityPreferences,
	type ReachabilitySource,
	type ReachabilitySubscriber,
	type ReadFailure,
	type SubscriberReachabilityResult,
	subscriberDashboardPath,
	subscriberDisplayName,
} from "../utils/subscriber-reachability";
import type { ToolAccessors } from "../utils/tool-accessors";
import { type ApiCallResult, type ToolContext, ToolFactory } from "../utils/tool-factory";
import { ValidationUtils } from "../utils/validation";
import { SUBSCRIBER_REACHABILITY_TOOL_NAMES } from "./tool-names";

export const [SUBSCRIBER_REACHABILITY_TOOL_NAME] = SUBSCRIBER_REACHABILITY_TOOL_NAMES;

const SEARCH_LIMIT = 10;
const ENDPOINTS_LIMIT = 100;
const MAX_CONNECTION_LOOKUPS = 10;

type Json = Record<string, unknown>;
type FailedCall = Extract<ApiCallResult, { ok: false }>;

const reachabilitySchema = z.object({
	email: z
		.string()
		.optional()
		.describe("Email address, matched exactly; a lowercase retry is automatic"),
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
		description:
			"Check which channels (email, in-app, SMS, push, chat) can reach one subscriber and, for each one that can't, why: missing address or push token, no active integration, preferences, or a chat endpoint without a connection. Give one of subscriberId, email, phone or name; several matches return candidates to choose from. Covers setup, not delivery history: use the notification or workflow-run tools for what was sent. Never returns phone numbers, custom data or credentials.",
		handler: async (input, context) => {
			const validationError = ValidationUtils.validateAtLeastOneParam(input, [
				"subscriberId",
				"email",
				"phone",
				"name",
			]);
			if (validationError) {
				return validationError;
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
		const response = await read(context, `/v2/subscribers?${query.toString()}`);
		if (!response.ok) {
			return { failure: response, kind: "error" };
		}

		const matches = asArray(response.data);
		if (matches.length === 1) {
			return { kind: "found", subscriber: matches[0] };
		}
		if (matches.length > 1) {
			return {
				kind: "done",
				result: {
					candidates: matches.map((match) => ({
						dashboardPath: subscriberDashboardPath(String(match.subscriberId)),
						email: stringOrNull(match.email),
						name: subscriberDisplayName({
							firstName: stringOrNull(match.firstName),
							lastName: stringOrNull(match.lastName),
						}),
						subscriberId: String(match.subscriberId),
					})),
					status: "ambiguous",
				},
			};
		}
	}

	// The phone number stays out of the result, even the one the caller searched for.
	return notFound(field, field === "phone" ? undefined : values[0]);
}

function searchAttempts(input: ReachabilityInput): {
	field: "email" | "phone" | "name";
	values: string[];
} {
	if (input.email) {
		return { field: "email", values: unique([input.email, input.email.trim().toLowerCase()]) };
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
		limit: String(ENDPOINTS_LIMIT),
		subscriberId: subscriber.subscriberId,
	});

	const [integrations, preferences, criticalPreferences, endpoints] = await Promise.all([
		read(context, "/v1/integrations"),
		read(context, `/v2/subscribers/${subscriberId}/preferences`),
		read(context, `/v2/subscribers/${subscriberId}/preferences?criticality=critical`),
		read(context, `/v1/channel-endpoints?${endpointsQuery.toString()}`),
	]);

	const endpointList = endpoints.ok ? asArray(endpoints.data).map(toEndpoint) : [];
	const referencedConnectionIds = unique(
		endpointList
			.map((endpoint) => endpoint.connectionIdentifier)
			.filter((identifier): identifier is string => Boolean(identifier)),
	);
	const connectionIds = referencedConnectionIds.slice(0, MAX_CONNECTION_LOOKUPS);
	const connectionReads = await Promise.all(
		connectionIds.map((identifier) =>
			read(context, `/v1/channel-connections/${encodeURIComponent(identifier)}`),
		),
	);

	const failures: Partial<Record<ReachabilitySource, ReadFailure>> = {};
	const sources = { criticalPreferences, endpoints, integrations, preferences };
	for (const [source, response] of Object.entries(sources) as Array<
		[ReachabilitySource, ApiCallResult]
	>) {
		if (!response.ok) failures[source] = toReadFailure(response);
	}
	// A deleted connection is a finding ("no connection"), not a failed read.
	const failedConnection = connectionReads.find(
		(response): response is FailedCall => !response.ok && response.status !== 404,
	);
	if (failedConnection) failures.connections = toReadFailure(failedConnection);

	return computeSubscriberReachability({
		connections: connectionReads.flatMap((response) =>
			response.ok ? [toConnection(asRecord(response.data) ?? {})] : [],
		),
		criticalPreferences: criticalPreferences.ok
			? toPreferences(criticalPreferences.data)
			: undefined,
		endpoints: endpointList,
		failures,
		integrations: integrations.ok
			? asArray(integrations.data)
					.filter(
						(integration) =>
							!subscriber.environmentId ||
							!integration._environmentId ||
							integration._environmentId === subscriber.environmentId,
					)
					.map(toIntegration)
			: [],
		// One page of endpoints and a capped number of connection lookups: what's left over is "not checked".
		limits: {
			endpointsTruncated: endpointList.length >= ENDPOINTS_LIMIT,
			uncheckedConnectionIds: referencedConnectionIds.slice(MAX_CONNECTION_LOOKUPS),
		},
		preferences: preferences.ok ? toPreferences(preferences.data) : undefined,
		subscriber,
	});
}

/** One GET that never throws: a network error comes back as a failed call with status 0. */
async function read(context: ToolContext, endpoint: string): Promise<ApiCallResult> {
	try {
		return await ToolFactory.callApi(context, { endpoint, method: "GET" });
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
				integrationId: stringOrNull(channel._integrationId),
				integrationIdentifier: stringOrNull(channel.integrationIdentifier),
				providerId: String(channel.providerId ?? ""),
			};
		}),
		email: stringOrNull(raw.email),
		environmentId: stringOrNull(raw._environmentId),
		firstName: stringOrNull(raw.firstName),
		hasPhone: typeof raw.phone === "string" && raw.phone.trim().length > 0,
		isOnline: typeof raw.isOnline === "boolean" ? raw.isOnline : null,
		lastName: stringOrNull(raw.lastName),
		lastOnlineAt: stringOrNull(raw.lastOnlineAt),
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

function toEndpoint(raw: Json): ReachabilityEndpoint {
	return {
		channel: stringOrNull(raw.channel),
		connectionIdentifier: stringOrNull(raw.connectionIdentifier),
		contextKeys: Array.isArray(raw.contextKeys)
			? raw.contextKeys.filter((key): key is string => typeof key === "string")
			: [],
		hasTenantId: Boolean(asRecord(raw.endpoint)?.tenantId),
		identifier: String(raw.identifier ?? ""),
		integrationIdentifier: stringOrNull(raw.integrationIdentifier),
		providerId: stringOrNull(raw.providerId),
		type: String(raw.type ?? ""),
	};
}

function toConnection(raw: Json): ReachabilityConnection {
	return {
		hasWorkspaceId: Boolean(asRecord(raw.workspace)?.id),
		identifier: String(raw.identifier ?? ""),
	};
}

function toPreferences(data: unknown): ReachabilityPreferences | undefined {
	return asRecord(data) as ReachabilityPreferences | undefined;
}

function asRecord(value: unknown): Json | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as Json)
		: undefined;
}

function asArray(value: unknown): Json[] {
	return Array.isArray(value)
		? value.filter((item): item is Json => Boolean(asRecord(item)))
		: [];
}

function stringOrNull(value: unknown): string | null {
	return typeof value === "string" && value ? value : null;
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}
