/**
 * Compact views of Activity API responses for the activity tools. A run or
 * request carries payloads, request bodies and raw provider errors (which can
 * hold request headers and credentials); only the fields that explain an
 * outcome leave this module.
 */

type JsonRecord = Record<string, unknown>;

const PROVIDER_RESPONSE_CAP = 500;
const TEXT_CAP = 200;
/** Deep enough for an axios error's `response.data.errors[0].message`. */
const MAX_RESPONSE_DEPTH = 6;
const MAX_DETAILS_PER_STEP = 10;

/** Keys of a provider or API error that say what went wrong. Everything else in `raw` is dropped. */
const SAFE_RESPONSE_KEYS = new Set([
	"body",
	"code",
	"data",
	"description",
	"detail",
	"details",
	"error",
	"errorCode",
	"errorMessage",
	"errors",
	"message",
	"name",
	"reason",
	"response",
	"status",
	"statusCode",
	"statusText",
	"title",
	"type",
]);

const UNSAFE_KEY =
	/config|headers|request|auth|key|token|secret|password|credential|cookie|signature/i;
const CREDENTIAL_VALUE = /\b(Bearer|Basic|ApiKey|Token)\s+[\w\-.~+/=]+/gi;
const LONG_TOKEN = /[A-Za-z0-9_\-+=]{40,}/g;
const URL_IN_TEXT = /\bhttps?:\/\/[^\s"'<>]+/gi;
// A failed context lookup on trigger appends the whole trigger context, data included, to its error message.
const CONTEXT_SUFFIX = /\s*\| Context: [\s\S]*$/;
/** A path segment that reads like an id or secret, such as the last parts of a chat webhook URL. */
export const SECRET_LIKE_SEGMENT = /^(?=[^/]*\d)(?=[^/]*[A-Za-z])[\w\-.~]{16,}$/;

const ATTENTION_STATUSES = new Set(["Failed", "Warning"]);

export const TRIGGER_URL_PATTERNS = [
	"/v1/events/trigger",
	"/v1/events/trigger/bulk",
	"/v1/events/trigger/broadcast",
] as const;

export function asRecord(value: unknown): JsonRecord | undefined {
	return value && typeof value === "object" && !Array.isArray(value)
		? (value as JsonRecord)
		: undefined;
}

export function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asArray(value: unknown): unknown[] {
	return Array.isArray(value) ? value : [];
}

function truncate(value: string, cap: number): string {
	return value.length <= cap ? value : `${value.slice(0, cap)}…`;
}

/**
 * A URL in an error message (an HTTP step's warning quotes the URL it called) keeps its origin and path; credentials,
 * the query and secret-looking path segments are redacted.
 */
function redactUrl(text: string): string {
	try {
		const url = new URL(text);
		const path = url.pathname
			.split("/")
			.map((segment) => (SECRET_LIKE_SEGMENT.test(segment) ? "[redacted]" : segment))
			.join("/");

		return `${url.protocol}//${url.host}${path}${url.search ? "?[redacted]" : ""}`;
	} catch {
		return "[redacted URL]";
	}
}

/** Error text with URL secrets, credential values and long tokens redacted, capped at 200 characters. */
export function scrub(value: string): string {
	return truncate(
		value
			.replace(CONTEXT_SUFFIX, "")
			.replace(URL_IN_TEXT, redactUrl)
			.replace(CREDENTIAL_VALUE, "$1 [redacted]")
			.replace(LONG_TOKEN, "[redacted]"),
		TEXT_CAP,
	);
}

function parseJson(text: unknown): unknown {
	if (typeof text !== "string" || text.length === 0) return undefined;
	try {
		return JSON.parse(text);
	} catch {
		return undefined;
	}
}

function pickSafe(value: unknown, depth: number): unknown {
	if (typeof value === "string") return value ? scrub(value) : undefined;
	if (typeof value === "number" || typeof value === "boolean") return value;
	if (!value || typeof value !== "object" || depth >= MAX_RESPONSE_DEPTH) return undefined;

	if (Array.isArray(value)) {
		const items = value
			.slice(0, 3)
			.map((item) => pickSafe(item, depth + 1))
			.filter((item) => item !== undefined);

		return items.length > 0 ? items : undefined;
	}

	const picked: JsonRecord = {};
	for (const [key, child] of Object.entries(value)) {
		if (UNSAFE_KEY.test(key) || !SAFE_RESPONSE_KEYS.has(key)) continue;
		const safe = pickSafe(child, depth + 1);
		if (safe !== undefined) picked[key] = safe;
	}

	return Object.keys(picked).length > 0 ? picked : undefined;
}

/**
 * The parts of an execution detail's `raw` that explain an outcome: status
 * codes, error codes and messages. `raw` that is not JSON is dropped, never
 * returned as is; keys under config, headers, request or auth are dropped, and
 * credential-looking values are redacted. Capped at about 500 characters.
 */
export function safeProviderResponse(raw: unknown): unknown {
	const parsed = parseJson(raw);
	const picked = typeof parsed === "string" ? pickSafe(parsed, 0) : pickSafe(asRecord(parsed), 0);
	if (picked === undefined) return undefined;

	const text = JSON.stringify(picked);

	return text.length <= PROVIDER_RESPONSE_CAP ? picked : truncate(text, PROVIDER_RESPONSE_CAP);
}

function toExecutionDetail(detail: JsonRecord) {
	return {
		createdAt: asString(detail.createdAt),
		detail: asString(detail.detail),
		// Only a failure or warning carries a provider response; a success's raw can be the message itself.
		providerResponse: ATTENTION_STATUSES.has(String(detail.status))
			? safeProviderResponse(detail.raw)
			: undefined,
		status: asString(detail.status),
	};
}

/** At most 10 details per step: every failure and warning first, then the latest others. */
function pickExecutionDetails(details: JsonRecord[]): JsonRecord[] {
	if (details.length <= MAX_DETAILS_PER_STEP) return details;

	const keep = new Set(
		details
			.filter((detail) => ATTENTION_STATUSES.has(String(detail.status)))
			.slice(-MAX_DETAILS_PER_STEP),
	);
	for (let index = details.length - 1; index >= 0 && keep.size < MAX_DETAILS_PER_STEP; index--) {
		keep.add(details[index]);
	}

	return details.filter((detail) => keep.has(detail));
}

function toStepDetail(step: JsonRecord) {
	const details = asArray(step.executionDetails)
		.map(asRecord)
		.filter((detail): detail is JsonRecord => detail !== undefined);
	const kept = pickExecutionDetails(details);
	const errorMessage = asString(step.errorMessage);

	return {
		errorCode: asString(step.errorCode),
		errorMessage: errorMessage ? scrub(errorMessage) : undefined,
		executionDetails: kept.map(toExecutionDetail),
		executionDetailsOmitted:
			details.length > kept.length ? details.length - kept.length : undefined,
		providerId: asString(step.providerId),
		status: asString(step.status),
		stepId: asString(step.stepId),
		stepType: asString(step.stepType),
	};
}

const RUNS_PATH = "/activity/workflow-runs";
const REQUESTS_PATH = "/activity/requests";

/** A dashboard path with the query params that are set. */
function toDashboardPath(path: string, params: [string, string | undefined][]): string {
	const search = new URLSearchParams();
	for (const [key, value] of params) {
		// An empty `contextKeys` is a filter of its own: runs without a context.
		if (value || (key === "contextKeys" && value === "")) search.append(key, value);
	}
	const query = search.toString();

	return query ? `${path}?${query}` : path;
}

function toIsoDate(value: string | undefined): string | undefined {
	return value === undefined || Number.isNaN(Date.parse(value))
		? undefined
		: new Date(value).toISOString();
}

/**
 * The dashboard's workflow runs page with these filters, as a path under
 * `/env/<environment>`. Its `workflows` filter takes workflow _ids, and it has no
 * status filter. A date range needs both ends, so `createdAfter` alone runs to now.
 */
export function workflowRunsDashboardPath(
	filters: {
		channels?: string[];
		contextKeys?: string[];
		createdAfter?: string;
		createdBefore?: string;
		severity?: string[];
		subscriberId?: string;
		subscriptionId?: string;
		topicKey?: string;
		transactionId?: string;
		workflowId?: string;
	},
	now = new Date(),
): string {
	const after = toIsoDate(filters.createdAfter);
	const before = after ? (toIsoDate(filters.createdBefore) ?? now.toISOString()) : undefined;

	return toDashboardPath(RUNS_PATH, [
		["workflows", filters.workflowId],
		["subscriberId", filters.subscriberId],
		["channels", filters.channels?.join(",")],
		["transactionId", filters.transactionId],
		["topicKey", filters.topicKey],
		["subscriptionId", filters.subscriptionId],
		["severity", filters.severity?.join(",")],
		// The page repeats this param, one per context.
		...(filters.contextKeys ?? []).map((key): [string, string] => ["contextKeys", key]),
		["dateRange", after ? "custom" : undefined],
		["after", after],
		["before", before],
	]);
}

/** The dashboard's requests page with these filters; `createdGte` is in epoch milliseconds there. */
export function triggerRequestsDashboardPath(filters: {
	createdAfter?: string;
	statusCodes?: number[];
	transactionId?: string;
	urlPattern?: string;
}): string {
	const createdAfter = toIsoDate(filters.createdAfter);

	return toDashboardPath(REQUESTS_PATH, [
		...(filters.statusCodes ?? []).map((code): [string, string] => ["status", String(code)]),
		["transactionId", filters.transactionId],
		["urlPattern", filters.urlPattern],
		["createdGte", createdAfter ? String(Date.parse(createdAfter)) : undefined],
	]);
}

function runDashboardPath(id: string | undefined): string | undefined {
	return id ? toDashboardPath(RUNS_PATH, [["activityItemId", id]]) : undefined;
}

/** The requests page only opens a request that is on its current page, so it also filters by the transaction. */
function requestDashboardPath(id: string | undefined, transactionId: string | undefined) {
	return id
		? toDashboardPath(REQUESTS_PATH, [
				["transactionId", transactionId],
				["selectedLogId", id],
			])
		: undefined;
}

function runFields(run: JsonRecord) {
	const id = asString(run.id);

	return {
		createdAt: asString(run.createdAt),
		dashboardPath: runDashboardPath(id),
		deliveryLifecycleDetail: asString(run.deliveryLifecycleDetail),
		deliveryLifecycleStatus: asString(run.deliveryLifecycleStatus),
		id,
		status: asString(run.status),
		subscriberId: asString(run.subscriberId),
		transactionId: asString(run.transactionId),
		workflowIdentifier: asString(run.triggerIdentifier),
		workflowName: asString(run.workflowName),
	};
}

/** One row of `GET /v1/activity/workflow-runs`. */
export function toRunSummary(run: JsonRecord) {
	return {
		...runFields(run),
		steps: asArray(run.steps)
			.map(asRecord)
			.filter((step): step is JsonRecord => step !== undefined)
			.map((step) => ({
				status: asString(step.status),
				stepId: asString(step.stepId),
				stepType: asString(step.stepType),
			})),
	};
}

/** `GET /v1/activity/workflow-runs/:id` without payload, overrides or raw provider data. */
export function toRunDetail(run: JsonRecord) {
	return {
		run: { ...runFields(run), workflowId: asString(run.workflowId) },
		steps: asArray(run.steps)
			.map(asRecord)
			.filter((step): step is JsonRecord => step !== undefined)
			.map(toStepDetail),
	};
}

/** The trigger events in a request body: one for trigger and broadcast, several for bulk. */
function triggerEvents(body: unknown): JsonRecord[] {
	const record = asRecord(body);
	if (!record) return [];
	if (Array.isArray(record.events)) {
		return record.events
			.map(asRecord)
			.filter((event): event is JsonRecord => event !== undefined);
	}

	return [record];
}

/** subscriberIds named by `to`: a string, `{ subscriberId }`, or an array of those. */
function recipients(to: unknown): string[] {
	if (typeof to === "string") return [to];
	if (Array.isArray(to)) return to.flatMap(recipients);
	const subscriberId = asString(asRecord(to)?.subscriberId);

	return subscriberId ? [subscriberId] : [];
}

/**
 * Whether one event of a request's body names this workflow (`name`) and subscriber (`to`). A body the API truncated
 * at 50 KB is not valid JSON, and a text search could pair values from different events or the payload, so it is
 * `unchecked` rather than guessed.
 */
export function matchTriggerRequest(
	row: JsonRecord,
	filters: { workflowId?: string; subscriberId?: string },
): "match" | "no_match" | "unchecked" {
	if (!filters.workflowId && !filters.subscriberId) return "match";

	const text = typeof row.requestBody === "string" ? row.requestBody : "";
	const events = triggerEvents(parseJson(text));
	if (events.length === 0) return text ? "unchecked" : "no_match";

	const matches = events.some(
		(event) =>
			(!filters.workflowId || event.name === filters.workflowId) &&
			(!filters.subscriberId || recipients(event.to).includes(filters.subscriberId)),
	);

	return matches ? "match" : "no_match";
}

function workflowNames(body: unknown): string | undefined {
	const names = [...new Set(triggerEvents(body).flatMap((event) => asString(event.name) ?? []))];
	if (names.length === 0) return undefined;

	return names.length > 3 ? `${names.slice(0, 3).join(", ")}, …` : names.join(", ");
}

/** The trigger result status and a short error from a response body. */
function triggerOutcome(responseBody: unknown): { error?: string; triggerStatus?: string } {
	const response = asRecord(parseJson(responseBody));
	if (!response) return {};

	const message = Array.isArray(response.message)
		? response.message.filter((item) => typeof item === "string").join("; ")
		: (asString(response.message) ?? asString(response.error));
	if (message) return { error: scrub(message) };

	const results = Array.isArray(response.data) ? response.data : [response.data];
	const records = results
		.map(asRecord)
		.filter((result): result is JsonRecord => result !== undefined);
	const statuses = [...new Set(records.flatMap((result) => asString(result.status) ?? []))];
	const errors = records.flatMap((result) =>
		asArray(result.error).filter((item): item is string => typeof item === "string"),
	);

	return {
		error: errors.length > 0 ? scrub(errors.join("; ")) : undefined,
		triggerStatus: statuses.length > 0 ? statuses.join(", ") : undefined,
	};
}

/** One trigger request without its request or response body. */
export function toTriggerRequestSummary(row: JsonRecord) {
	const id = asString(row.id);
	const transactionId = asString(row.transactionId);

	return {
		createdAt: asString(row.createdAt),
		dashboardPath: requestDashboardPath(id, transactionId),
		id,
		statusCode: typeof row.statusCode === "number" ? row.statusCode : undefined,
		transactionId,
		urlPattern: asString(row.urlPattern),
		workflow: workflowNames(parseJson(row.requestBody)),
		...triggerOutcome(row.responseBody),
	};
}

/**
 * Whether a request row belongs to this transaction. The requests API matches `transactionId` as a substring, so
 * `order_1` also finds `order_10`; a bulk request stores its transaction ids comma-joined.
 */
export function hasTransactionId(row: JsonRecord, transactionId: string): boolean {
	return (asString(row.transactionId) ?? "").split(",").includes(transactionId);
}

/** `GET /v1/activity/requests/:id`: the request without its bodies, and what Novu did with it. */
export function toTriggerRequestDetail(payload: unknown) {
	const record = asRecord(payload);

	return {
		request: toTriggerRequestSummary(asRecord(record?.request) ?? {}),
		traces: asArray(record?.traces)
			.map(asRecord)
			.filter((trace): trace is JsonRecord => trace !== undefined)
			.map((trace) => {
				const message = asString(trace.message);

				return {
					createdAt: asString(trace.createdAt),
					eventType: asString(trace.eventType),
					message: message ? scrub(message) : undefined,
					status: asString(trace.status),
					subscriberId: asString(trace.externalSubscriberId),
					title: asString(trace.title),
				};
			}),
	};
}

/** The `{ data }` rows of a paginated Activity list. */
export function listRows(payload: unknown): JsonRecord[] {
	return asArray(asRecord(payload)?.data)
		.map(asRecord)
		.filter((row): row is JsonRecord => row !== undefined);
}
