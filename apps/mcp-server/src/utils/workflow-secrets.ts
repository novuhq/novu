/**
 * Hides the values of an HTTP request step that can hold a credential from the models that read a workflow: the
 * workflow tools' results, and the Copilot's view of the workflow (enterprise `workflow.prompt.ts`). An author can
 * write a token straight into a header, the body or the URL, and the API returns it as stored.
 *
 * What stays visible is an allow-list, so a value in an unknown shape is hidden:
 * - header names, the values of `SAFE_HEADER_NAMES`, and values made only of template expressions
 *   (`Bearer {{env.API_TOKEN}}`);
 * - a JSON body's keys, numbers, booleans and template-only strings;
 * - the URL's scheme, host and path, except token-shaped path segments, and template-only query values.
 *
 * Everything else reads `HIDDEN_SECRET`. A write that sends the placeholder back where it was shown keeps the stored
 * value (`restoreWorkflowSecrets`); a placeholder with no stored value there is refused, so it is never saved.
 */

import { asRecord } from "./activity-format";

type JsonObject = Record<string, unknown>;

/** The placeholder for a hidden value: `SECRET_MASK` in `@novu/shared`, as the dashboard shows secret variables. */
export const HIDDEN_SECRET = "••••••••";

/**
 * The placeholder, or one a caller cut short. A write never saves one: only the exact placeholder, where a stored
 * value shows as it, is restored.
 */
const HIDDEN_PATTERN = /•{4,}/;

const HTTP_REQUEST_STEP_TYPE = "http_request";

const SAFE_HEADER_NAMES = new Set([
	"accept",
	"accept-charset",
	"accept-encoding",
	"accept-language",
	"cache-control",
	"content-language",
	"content-type",
	"user-agent",
]);

/**
 * Liquid output and tags without quoted text, which resolve at send time, plus the stand-ins `redactUrl` puts in their
 * place. A quoted string inside a tag is written into the step (`{{ 'sk_live_…' }}`), so a tag that holds one counts as
 * literal text.
 */
const TEMPLATE_PATTERN = /\{\{[^'"]*?\}\}|\{%[^'"]*?%\}|\d+/g;

/** Words that may lead a credential's value without being one, as in `Bearer {{env.API_TOKEN}}`. */
const AUTH_SCHEME_PATTERN = /^(?:basic|bearer|bot|digest|token)$/i;

/**
 * A literal path segment at least this long reads as a token, such as a webhook secret, when it mixes letters and
 * digits, or upper and lower case without word separators.
 */
const MIN_TOKEN_SEGMENT_LENGTH = 16;

const URL_PATTERN = /^((?:[a-z][a-z\d+.-]*:)?\/\/)?([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#(.*))?$/i;

/** `shown` is how a stored pair reads once redacted, when that isn't the pair's own redaction (`toBodyPairs`). */
type KeyValue = { key: string; value: unknown; shown?: unknown };

type StepLike = {
	_id?: string;
	stepId?: string;
	name?: string;
	type?: string;
	controlValues?: JsonObject | null;
};

export type SecretsRestore<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Whether a value holds the placeholder anywhere, including inside a JSON body string that spells it with `•`
 * escapes. A write only needs the stored workflow when it does.
 */
export function hasHiddenSecret(value: unknown): boolean {
	if (typeof value === "string") {
		if (HIDDEN_PATTERN.test(value)) return true;
		const parsed = value.includes("\\u") ? parseJsonContainer(value) : undefined;

		return parsed !== undefined && hasHiddenSecret(parsed);
	}
	if (Array.isArray(value)) return value.some(hasHiddenSecret);
	const record = asRecord(value);

	return record ? Object.values(record).some(hasHiddenSecret) : false;
}

/** A workflow, or one inside the API's `{ data }` envelope, with each HTTP request step's secrets hidden. */
export function redactWorkflowSecrets<T>(value: T): T {
	const envelope = asRecord(value);
	if (envelope && !Array.isArray(envelope.steps) && "data" in envelope) {
		return { ...envelope, data: redactWorkflow(envelope.data) } as T;
	}

	return redactWorkflow(value) as T;
}

function redactWorkflow(value: unknown): unknown {
	const workflow = asRecord(value);
	if (!workflow || !Array.isArray(workflow.steps)) return value;

	return { ...workflow, steps: workflow.steps.map(redactStepSecrets) };
}

/** A step with its secrets hidden when it is an HTTP request step, in its control values and its controls metadata. */
export function redactStepSecrets<T>(value: T): T {
	const step = asRecord(value);
	if (step?.type !== HTTP_REQUEST_STEP_TYPE) return value;

	const redacted: JsonObject = { ...step };
	const controlValues = asRecord(step.controlValues);
	if (controlValues) redacted.controlValues = redactHttpRequestControlValues(controlValues);

	// `GET /v2/workflows/:id` repeats the values in the controls metadata.
	const controls = asRecord(step.controls);
	const values = asRecord(controls?.values);
	if (controls && values) {
		redacted.controls = { ...controls, values: redactHttpRequestControlValues(values) };
	}

	return redacted as T;
}

/** An HTTP request step's control values with its headers, body and URL redacted; the other values are kept. */
export function redactHttpRequestControlValues<T extends JsonObject>(controlValues: T): T {
	const redacted: JsonObject = { ...controlValues };
	if ("headers" in controlValues) redacted.headers = redactHeaders(controlValues.headers);
	if ("body" in controlValues) redacted.body = redactBody(controlValues.body);
	if ("url" in controlValues) redacted.url = redactUrl(controlValues.url);

	return redacted as T;
}

/**
 * `steps` with every placeholder in an HTTP request step's headers, body or URL replaced by the stored value it stands
 * for in `savedSteps`, matched by `_id`, else by `stepId`. Refused when a placeholder has no stored value at that place,
 * including any in a new step.
 */
export function restoreWorkflowSecrets<T extends StepLike>(
	steps: T[],
	savedSteps: readonly StepLike[] = [],
): SecretsRestore<T[]> {
	const restored: T[] = [];
	for (const step of steps) {
		const saved =
			(step._id !== undefined &&
				savedSteps.find((candidate) => candidate._id === step._id)) ||
			(step.stepId !== undefined &&
				savedSteps.find((candidate) => candidate.stepId === step.stepId)) ||
			undefined;
		const result = restoreStepSecrets(step, saved);
		if (!result.ok) return result;
		restored.push(result.value);
	}

	return { ok: true, value: restored };
}

/** One step's `restoreWorkflowSecrets`; `saved` is the same step as stored, or undefined for a new step. */
export function restoreStepSecrets<T extends StepLike>(
	step: T,
	saved: StepLike | undefined,
): SecretsRestore<T> {
	const controlValues = asRecord(step.controlValues);
	if (step.type !== HTTP_REQUEST_STEP_TYPE || !controlValues || !hasHiddenSecret(controlValues)) {
		return { ok: true, value: step };
	}

	const result = restoreHttpRequestSecrets(
		controlValues,
		saved?.type === HTTP_REQUEST_STEP_TYPE ? asRecord(saved.controlValues) : undefined,
		step.stepId ?? step.name ?? step._id ?? "",
	);

	return result.ok ? { ok: true, value: { ...step, controlValues: result.value } } : result;
}

/**
 * An HTTP request step's control values with each placeholder replaced by the stored value it stands for: a header by
 * name, a body value by key or JSON path, and the URL as a whole. A placeholder counts only where the stored value
 * shows as exactly what was sent back, and only where that place is unambiguous. `stepLabel` names the step in the
 * refusal.
 */
export function restoreHttpRequestSecrets(
	controlValues: JsonObject,
	saved: JsonObject | undefined,
	stepLabel: string,
): SecretsRestore<JsonObject> {
	const restored: JsonObject = { ...controlValues };
	if (hasHiddenSecret(controlValues.headers)) {
		restored.headers = restoreKeyValues(
			controlValues.headers,
			saved?.headers,
			redactHeader,
			true,
		);
	}
	if (hasHiddenSecret(controlValues.body)) {
		restored.body = restoreBody(controlValues.body, saved?.body);
	}
	if (hasHiddenSecret(controlValues.url) && controlValues.url === redactUrl(saved?.url)) {
		restored.url = saved?.url;
	}

	// A hidden header or body value stays with the host it was written for: an edit that points the step at another
	// host would otherwise send the stored credential there.
	const keepsHiddenValues =
		hasHiddenSecret(controlValues.headers) || hasHiddenSecret(controlValues.body);
	if (keepsHiddenValues && originOf(restored.url) !== originOf(saved?.url)) {
		const step = stepLabel ? `HTTP request step "${stepLabel}"` : "the HTTP request step";

		return {
			error: `The URL of ${step} now points at another host, so its hidden header and body values ("${HIDDEN_SECRET}") can't move with it. Keep the URL's host, or have the user enter the secrets for the new host in the dashboard.`,
			ok: false,
		};
	}

	const field = (["headers", "body", "url"] as const).find((key) =>
		hasHiddenSecret(restored[key]),
	);
	if (field) {
		return { error: hiddenValueError(stepLabel, field), ok: false };
	}

	return { ok: true, value: restored };
}

function hiddenValueError(stepLabel: string, field: string): string {
	const step = stepLabel ? `HTTP request step "${stepLabel}"` : "the HTTP request step";

	return `The ${field} of ${step} holds the hidden value "${HIDDEN_SECRET}" where no stored value exists, so it can't be saved. To keep a hidden value, send it back unchanged in the same header, body field or URL of the same step. For a new secret, reference an environment variable such as {{env.API_KEY}}, or have the user enter it in the dashboard.`;
}

function isTemplateOnly(value: string): boolean {
	return value
		.replace(TEMPLATE_PATTERN, " ")
		.split(/\s+/)
		.every((word) => word === "" || AUTH_SCHEME_PATTERN.test(word));
}

function isShownValue(value: unknown): boolean {
	return (
		value === undefined ||
		value === null ||
		(typeof value === "string" && isTemplateOnly(value))
	);
}

function isKeyValue(value: unknown): value is KeyValue {
	return asRecord(value) !== undefined && typeof (value as KeyValue).key === "string";
}

function redactHeader(header: KeyValue): KeyValue {
	const isShown =
		SAFE_HEADER_NAMES.has(header.key.trim().toLowerCase()) || isShownValue(header.value);

	return isShown ? header : { ...header, value: HIDDEN_SECRET };
}

function redactBodyPair(pair: KeyValue): KeyValue {
	return isShownValue(pair.value) ? pair : { ...pair, value: HIDDEN_SECRET };
}

function redactKeyValues(pairs: unknown[], redact: (pair: KeyValue) => KeyValue): unknown[] {
	return pairs.map((pair) => (isKeyValue(pair) ? redact(pair) : HIDDEN_SECRET));
}

function redactHeaders(headers: unknown): unknown {
	if (headers === undefined || headers === null) return headers;

	return Array.isArray(headers) ? redactKeyValues(headers, redactHeader) : HIDDEN_SECRET;
}

function redactBody(body: unknown): unknown {
	if (body === undefined || body === null) return body;
	if (Array.isArray(body)) return redactKeyValues(body, redactBodyPair);
	if (typeof body !== "string") return HIDDEN_SECRET;
	if (isTemplateOnly(body)) return body;

	const parsed = parseJsonContainer(body);

	return parsed === undefined ? HIDDEN_SECRET : JSON.stringify(redactJson(parsed));
}

function redactJson(value: unknown): unknown {
	if (typeof value === "string") return isTemplateOnly(value) ? value : HIDDEN_SECRET;
	if (Array.isArray(value)) return value.map(redactJson);
	const record = asRecord(value);
	if (record) {
		return Object.fromEntries(
			Object.entries(record).map(([key, entry]) => [key, redactJson(entry)]),
		);
	}

	return value;
}

function redactUrl(url: unknown): unknown {
	if (url === undefined || url === null) return url;
	if (typeof url !== "string") return HIDDEN_SECRET;
	if (isTemplateOnly(url)) return url;

	// A template can hold "/", "?" or "#": set templates aside so they can't split the URL.
	const templates: string[] = [];
	const marked = url.replace(TEMPLATE_PATTERN, (template) => `${templates.push(template) - 1}`);
	const match = URL_PATTERN.exec(marked);
	if (!match) return HIDDEN_SECRET;

	const [, scheme = "", authority = "", path = "", query, fragment] = match;
	const redacted = [
		scheme,
		redactAuthority(authority),
		path.split("/").map(redactPathSegment).join("/"),
		query === undefined ? "" : `?${query.split("&").map(redactQueryPair).join("&")}`,
		fragment === undefined ? "" : `#${isTemplateOnly(fragment) ? fragment : HIDDEN_SECRET}`,
	].join("");

	return redacted.replace(/(\d+)/g, (_, index: string) => templates[Number(index)]);
}

function redactAuthority(authority: string): string {
	const at = authority.lastIndexOf("@");
	if (at === -1) return authority;

	const userInfo = authority.slice(0, at);

	return `${isTemplateOnly(userInfo) ? userInfo : HIDDEN_SECRET}${authority.slice(at)}`;
}

/** The scheme and host a URL sends to, without its user info; a templated host compares as written. */
function originOf(url: unknown): string | undefined {
	if (typeof url !== "string") return undefined;
	const match = URL_PATTERN.exec(url.trim());
	if (!match) return undefined;

	const [, scheme = "", authority = ""] = match;

	return `${scheme}${authority.slice(authority.lastIndexOf("@") + 1)}`.toLowerCase();
}

/** A path segment, with its `;key=value` parameters redacted like query values. */
function redactPathSegment(segment: string): string {
	const [name, ...parameters] = segment.split(";");

	return [looksLikeToken(name) ? HIDDEN_SECRET : name, ...parameters.map(redactQueryPair)].join(
		";",
	);
}

function redactQueryPair(pair: string): string {
	const equals = pair.indexOf("=");
	if (equals === -1) return looksLikeToken(pair) ? HIDDEN_SECRET : pair;

	const value = pair.slice(equals + 1);

	return isTemplateOnly(value) ? pair : `${pair.slice(0, equals + 1)}${HIDDEN_SECRET}`;
}

function looksLikeToken(segment: string): boolean {
	if (isTemplateOnly(segment)) return false;
	const literal = segment.replace(TEMPLATE_PATTERN, "");
	if (literal.length < MIN_TOKEN_SEGMENT_LENGTH) return false;

	const mixesLettersAndDigits = /[a-z]/i.test(literal) && /\d/.test(literal);
	const mixesCase = /[a-z]/.test(literal) && /[A-Z]/.test(literal) && !/[-_.~]/.test(literal);

	return mixesLettersAndDigits || mixesCase;
}

/** A JSON object or array; undefined for anything else, which the body then hides whole. */
function parseJsonContainer(text: string): unknown {
	try {
		const parsed: unknown = JSON.parse(text);

		return typeof parsed === "object" && parsed !== null ? parsed : undefined;
	} catch {
		return undefined;
	}
}

/**
 * Each pair whose placeholder value stands for the stored pair with the same key. Headers match in any case, an exact
 * match first; a name that two stored headers share in different cases is ambiguous and left unrestored.
 */
function restoreKeyValues(
	pairs: unknown,
	savedPairs: unknown,
	redact: (pair: KeyValue) => KeyValue,
	ignoreCase = false,
): unknown {
	if (!Array.isArray(pairs)) return pairs;

	const saved = Array.isArray(savedPairs) ? savedPairs.filter(isKeyValue) : [];
	const findStored = (key: string): KeyValue | undefined => {
		const exact = saved.filter((candidate) => candidate.key === key);
		if (exact.length > 0 || !ignoreCase) return exact.length === 1 ? exact[0] : undefined;

		const anyCase = saved.filter(
			(candidate) => candidate.key.toLowerCase() === key.toLowerCase(),
		);

		return anyCase.length === 1 ? anyCase[0] : undefined;
	};

	return pairs.map((pair) => {
		if (!isKeyValue(pair) || !hasHiddenSecret(pair.value)) return pair;

		const stored = findStored(pair.key);
		const shown = stored && ("shown" in stored ? stored.shown : redact(stored).value);

		return stored && sameJson(shown, pair.value)
			? { key: pair.key, value: stored.value }
			: pair;
	});
}

/**
 * A stored JSON body's top-level string values as key-value pairs: the Copilot's edit tool sends a body only as pairs,
 * even for a step the dashboard saved with a JSON body.
 */
function toBodyPairs(savedBody: unknown): unknown {
	if (typeof savedBody !== "string") return savedBody;

	const parsed = asRecord(parseJsonContainer(savedBody));

	// A nested object or array goes as its JSON text, which is how the model can send it back as a pair's value.
	return Object.entries(parsed ?? {}).map(
		([key, value]): KeyValue =>
			typeof value === "string"
				? { key, value }
				: { key, shown: JSON.stringify(redactJson(value)), value: JSON.stringify(value) },
	);
}

/** Two values that are the same text, or the same JSON written with different spacing. */
function sameJson(a: unknown, b: unknown): boolean {
	const normalize = (value: unknown) => {
		const parsed = typeof value === "string" ? parseJsonContainer(value) : undefined;

		return parsed === undefined ? value : JSON.stringify(parsed);
	};

	return normalize(a) === normalize(b);
}

function restoreBody(body: unknown, savedBody: unknown): unknown {
	if (Array.isArray(body)) return restoreKeyValues(body, toBodyPairs(savedBody), redactBodyPair);
	if (typeof body !== "string") return body;
	// Sent back as shown: keep the stored text as it was written.
	if (body === redactBody(savedBody)) return savedBody;

	const parsed = parseJsonContainer(body);
	const savedParsed = typeof savedBody === "string" ? parseJsonContainer(savedBody) : undefined;
	if (parsed === undefined || savedParsed === undefined) return body;

	return JSON.stringify(restoreJson(parsed, savedParsed));
}

/**
 * `value` with each string that shows `saved`'s string at the same path replaced by it. Array items match by index only
 * while the array keeps its length: after an item is added or removed, a placeholder could stand for another item.
 */
function restoreJson(value: unknown, saved: unknown): unknown {
	if (typeof value === "string") {
		return hasHiddenSecret(value) && typeof saved === "string" && redactJson(saved) === value
			? saved
			: value;
	}
	if (Array.isArray(value)) {
		const sameLength = Array.isArray(saved) && saved.length === value.length;

		return value.map((entry, index) =>
			restoreJson(entry, sameLength ? saved[index] : undefined),
		);
	}
	const record = asRecord(value);
	if (record) {
		const savedRecord = asRecord(saved);

		return Object.fromEntries(
			Object.entries(record).map(([key, entry]) => [
				key,
				restoreJson(entry, savedRecord?.[key]),
			]),
		);
	}

	return value;
}
