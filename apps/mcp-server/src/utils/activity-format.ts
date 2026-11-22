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

function scrub(value: string): string {
	return truncate(
		value.replace(CREDENTIAL_VALUE, "$1 [redacted]").replace(LONG_TOKEN, "[redacted]"),
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
		providerResponse: safeProviderResponse(detail.raw),
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

function runFields(run: JsonRecord) {
	return {
		createdAt: asString(run.createdAt),
		deliveryLifecycleDetail: asString(run.deliveryLifecycleDetail),
		deliveryLifecycleStatus: asString(run.deliveryLifecycleStatus),
		id: asString(run.id),
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

function containsJsonPair(text: string, key: string, value: string): boolean {
	return text.includes(`"${key}":${JSON.stringify(value)}`);
}

/**
 * Whether a request's body names this workflow (`name`) and subscriber (`to`).
 * A body truncated at 50 KB is not valid JSON, so it falls back to a text match.
 */
export function triggerRequestMatches(
	row: JsonRecord,
	filters: { workflowId?: string; subscriberId?: string },
): boolean {
	if (!filters.workflowId && !filters.subscriberId) return true;

	const text = typeof row.requestBody === "string" ? row.requestBody : "";
	const events = triggerEvents(parseJson(text));
	if (events.length === 0) {
		return (
			(!filters.workflowId || containsJsonPair(text, "name", filters.workflowId)) &&
			(!filters.subscriberId ||
				containsJsonPair(text, "subscriberId", filters.subscriberId) ||
				containsJsonPair(text, "to", filters.subscriberId))
		);
	}

	return events.some(
		(event) =>
			(!filters.workflowId || event.name === filters.workflowId) &&
			(!filters.subscriberId || recipients(event.to).includes(filters.subscriberId)),
	);
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
	return {
		createdAt: asString(row.createdAt),
		id: asString(row.id),
		statusCode: typeof row.statusCode === "number" ? row.statusCode : undefined,
		transactionId: asString(row.transactionId),
		urlPattern: asString(row.urlPattern),
		workflow: workflowNames(parseJson(row.requestBody)),
		...triggerOutcome(row.responseBody),
	};
}

/** The `{ data }` rows of a paginated Activity list. */
export function listRows(payload: unknown): JsonRecord[] {
	return asArray(asRecord(payload)?.data)
		.map(asRecord)
		.filter((row): row is JsonRecord => row !== undefined);
}
