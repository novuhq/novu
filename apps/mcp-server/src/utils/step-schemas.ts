import { z } from "zod";
import { MAILY_BODY_GUIDE, mailyBodySchema } from "./maily-schemas";
import { optionalSkipConditionSchema } from "./skip-schemas";

/**
 * Workflow step schemas — one discriminated union member per Novu step type.
 *
 * Step-related enums live here (not in workflow-schemas.ts) so that
 * workflow-schemas.ts can import the step schemas from this file without
 * creating a circular dependency.
 */

// --- Step-related enums --------------------------------------------------

export const stepTypeSchema = z.enum([
	"in_app",
	"email",
	"sms",
	"chat",
	"push",
	"digest",
	"trigger",
	"delay",
	"throttle",
	"custom",
	"http_request",
]);
export type StepType = z.infer<typeof stepTypeSchema>;

export const timeUnitSchema = z.enum(["seconds", "minutes", "hours", "days", "weeks", "months"]);
export type TimeUnit = z.infer<typeof timeUnitSchema>;
// Throttle windows only accept these units (framework `throttleActionSchemas.output`).
const throttleUnitSchema = z.enum(["minutes", "hours", "days"]);

export const delayTypeSchema = z.enum(["regular", "timed", "dynamic"]);
export type DelayType = z.infer<typeof delayTypeSchema>;

export const digestTypeSchema = z.enum(["regular", "timed"]);
export type DigestType = z.infer<typeof digestTypeSchema>;

export const throttleTypeSchema = z.enum(["fixed", "dynamic"]);
export type ThrottleType = z.infer<typeof throttleTypeSchema>;

export const editorTypeSchema = z.enum(["block", "html"]);
export type EditorType = z.infer<typeof editorTypeSchema>;

export const httpMethodSchema = z.enum([
	"GET",
	"POST",
	"PUT",
	"DELETE",
	"PATCH",
	"HEAD",
	"OPTIONS",
]);
export type HttpMethod = z.infer<typeof httpMethodSchema>;

export const redirectTargetSchema = z.enum(["_self", "_blank", "_parent", "_top", "_unfencedTop"]);
export type RedirectTarget = z.infer<typeof redirectTargetSchema>;

// --- Action / redirect helpers --------------------------------------------

const redirectSchema = z.object({
	target: redirectTargetSchema
		.optional()
		.describe('Redirect target. Use "_self" for same window (default).'),
	url: z
		.string()
		.describe(
			'Redirect URL accepts absolute "https://" or "/" relative paths. Dynamic values MUST be wrapped in double curly braces, e.g. "{{ payload.url }}". Must not start with "mailto:".',
		),
});

const actionSchema = z.object({
	label: z.string().describe("Label for the action button."),
	redirect: redirectSchema.optional().describe("Redirect configuration for the action."),
});

// --- Per-channel control schemas ------------------------------------------

const inAppControlSchema = z.object({
	avatar: z
		.string()
		.optional()
		.describe(
			"Avatar image URL for the in-app notification. Must be an absolute https:// URL or a /relative path.",
		),
	body: z.string().describe("In-app notification body."),
	data: z
		.record(z.string(), z.unknown())
		.optional()
		.describe("Custom key-value data the Inbox receives with the notification as `data`."),
	disableOutputSanitization: z
		.boolean()
		.optional()
		.describe("Disable sanitization of the in-app output."),
	primaryAction: actionSchema
		.optional()
		.describe("Primary action button for the in-app notification."),
	redirect: redirectSchema
		.optional()
		.describe(
			"Redirect configuration applied for the in-app notification action when the in-app notification is clicked.",
		),
	secondaryAction: actionSchema
		.optional()
		.describe("Secondary action button for the in-app notification."),
	skip: optionalSkipConditionSchema,
	subject: z.string().describe("In-app notification title."),
});

const smsControlSchema = z.object({
	body: z
		.string()
		.describe(
			"SMS message body (non-empty). Keep messages under 160 characters to avoid splitting.",
		),
	skip: optionalSkipConditionSchema,
});

const pushControlSchema = z.object({
	body: z
		.string()
		.describe(
			"Push notification body (non-empty). Body should be under 150 characters for full visibility.",
		),
	skip: optionalSkipConditionSchema,
	subject: z
		.string()
		.describe(
			"Push notification title (non-empty). Title (subject) should be under 50 characters (gets truncated on most devices).",
		),
});

const chatControlSchema = z.object({
	body: z
		.string()
		.describe("Chat message body (non-empty). Be specific about what the user should do."),
	skip: optionalSkipConditionSchema,
});

/** The sender, reply-to and preview-text settings both email editors save next to the content. */
const emailSettingsFields = {
	from: z
		.object({
			email: z.string().optional().describe("Sender address."),
			name: z.string().optional().describe("Sender name."),
		})
		.optional()
		.describe(
			"Sender for this step. What you leave out comes from the agent the workflow is assigned to, if any, else from the email integration.",
		),
	preheader: z
		.string()
		.optional()
		.describe("Preview text most inboxes show after the subject line."),
	replyTo: z.string().optional().describe("Reply-to address for this step."),
	useProviderDefaults: z
		.boolean()
		.optional()
		.describe(
			"true skips the sender of the agent the workflow is assigned to, so the email integration's default sender fills in what `from` leaves out. It does not override `from`: a `from` on the step is still sent, and the dashboard clears `from` when it saves a step with this on, so set either this or a custom `from`, not both.",
		),
};

const emailBlockControlSchema = z.object({
	...emailSettingsFields,
	body: mailyBodySchema.describe("Email body in Maily TipTap JSON format."),
	disableOutputSanitization: z
		.boolean()
		.optional()
		.describe("Disable sanitization of the email output."),
	editorType: z
		.literal("block")
		.describe('Block editor mode. Use "block" when building simple emails layouts.'),
	layoutId: z
		.string()
		.nullable()
		.optional()
		.describe("Layout ID to use for the email. Pass null explicitly for no layout."),
	skip: optionalSkipConditionSchema,
	subject: z.string().describe("Email subject line."),
});

const emailHtmlControlSchema = z.object({
	...emailSettingsFields,
	body: z
		.string()
		.describe(
			"Email body in HTML format (non-empty). Use semantic HTML with inline styles. Structure with headings, paragraphs, and styled buttons.",
		),
	disableOutputSanitization: z
		.boolean()
		.optional()
		.describe("Disable sanitization of the email output."),
	editorType: z
		.literal("html")
		.describe('HTML editor mode. Use "html" when building complex emails layouts.'),
	layoutId: z
		.string()
		.nullable()
		.optional()
		.describe("Layout ID to use for the email. Pass null explicitly for no layout."),
	skip: optionalSkipConditionSchema,
	subject: z.string().describe("Email subject line."),
});

const emailControlSchema = z.discriminatedUnion("editorType", [
	emailBlockControlSchema,
	emailHtmlControlSchema,
]);

const delayRegularControlSchema = z.object({
	amount: z.number().min(1).describe("Amount of time to delay (must be >= 1)."),
	extendToSchedule: z
		.boolean()
		.optional()
		.describe("When true, extend the delay to the subscriber's next allowed schedule window."),
	skip: optionalSkipConditionSchema,
	type: z.literal("regular").describe('Regular delay type ("wait for amount + unit").'),
	unit: timeUnitSchema.describe("Time unit for the delay."),
});

const delayTimedControlSchema = z.object({
	cron: z.string().describe("Cron expression for the timed delay (non-empty)."),
	extendToSchedule: z
		.boolean()
		.optional()
		.describe("When true, extend the delay to the subscriber's next allowed schedule window."),
	skip: optionalSkipConditionSchema,
	type: z.literal("timed").describe('Timed delay type ("wait until cron schedule").'),
});

const delayDynamicControlSchema = z.object({
	dynamicKey: z
		.string()
		.min(1)
		.describe(
			"Payload variable path holding an ISO-8601 timestamp or an { amount, unit } duration, e.g. 'payload.sendAt'.",
		),
	extendToSchedule: z
		.boolean()
		.optional()
		.describe("When true, extend the delay to the subscriber's next allowed schedule window."),
	skip: optionalSkipConditionSchema,
	type: z
		.literal("dynamic")
		.describe(
			"Dynamic delay type. The wait is read at runtime from the `dynamicKey` variable.",
		),
});

const delayControlSchema = z.discriminatedUnion("type", [
	delayRegularControlSchema,
	delayTimedControlSchema,
	delayDynamicControlSchema,
]);

const digestRegularControlSchema = z.object({
	amount: z.number().min(1).describe("Amount of time for the digest window (must be >= 1)."),
	digestKey: z
		.string()
		.optional()
		.describe(
			"Variable path to group notifications by, e.g. 'payload.orderId'. Omit to group across all events for the subscriber.",
		),
	extendToSchedule: z.boolean().optional().describe("Extend the digest window to the schedule."),
	lookBackWindow: z
		.object({
			amount: z
				.number()
				.min(1)
				.describe("Amount of time for the look-back window (must be >= 1)."),
			extendToSchedule: z
				.boolean()
				.optional()
				.describe("Extend the look-back window to the schedule."),
			unit: timeUnitSchema.describe("Time unit for the look-back window."),
		})
		.optional()
		.describe("Look-back window configuration for the digest."),
	skip: optionalSkipConditionSchema,
	type: z
		.literal("regular")
		.describe(
			"Regular digest. Groups events within the configured time window starting from the first event.",
		),
	unit: timeUnitSchema.describe("Time unit for the digest window."),
});

const digestTimedControlSchema = z.object({
	cron: z.string().describe("Cron expression for the timed digest (non-empty)."),
	digestKey: z.string().optional().describe("Variable path to group notifications by."),
	extendToSchedule: z.boolean().optional().describe("Extend the digest window to the schedule."),
	skip: optionalSkipConditionSchema,
	type: z
		.literal("timed")
		.describe(
			"Timed digest. Collects events until a specific scheduled time (UTC), then continues with all collected events.",
		),
});

const digestControlSchema = z.discriminatedUnion("type", [
	digestRegularControlSchema,
	digestTimedControlSchema,
]);

const throttleFixedControlSchema = z.object({
	amount: z.number().min(1).describe("Amount of time for the throttle window (must be >= 1)."),
	skip: optionalSkipConditionSchema,
	threshold: z
		.number()
		.min(1)
		.describe("Maximum number of notifications allowed in the window (must be >= 1)."),
	throttleKey: z
		.string()
		.optional()
		.describe("Variable path to group throttle rules by, e.g. 'payload.userId'."),
	type: z
		.literal("fixed")
		.describe(
			"Fixed throttle. Allows up to `threshold` notifications per fixed window of `amount` + `unit`.",
		),
	unit: throttleUnitSchema.describe("Time unit for the throttle window."),
});

const throttleDynamicControlSchema = z.object({
	dynamicKey: z
		.string()
		.describe(
			"Variable path that resolves the dynamic throttle window at runtime, e.g. 'payload.windowMs'.",
		),
	skip: optionalSkipConditionSchema,
	threshold: z
		.number()
		.min(1)
		.describe("Maximum number of notifications allowed in the window (must be >= 1)."),
	throttleKey: z.string().optional().describe("Variable path to group throttle rules by."),
	type: z
		.literal("dynamic")
		.describe(
			"Dynamic throttle. Throttle window is derived at runtime from the `dynamicKey` variable.",
		),
});

const throttleControlSchema = z.discriminatedUnion("type", [
	throttleFixedControlSchema,
	throttleDynamicControlSchema,
]);

const httpKeyValuePairSchema = z.object({
	key: z.string().min(1).describe("Header or body key (non-empty)."),
	value: z
		.string()
		.describe("Header or body value. Use {{payload.variableName}} for dynamic values."),
});

// Passthrough keeps nested `properties`, `items` and `required`, so nested response fields survive a save.
const httpResponsePropertySchema = z
	.object({
		type: z
			.enum(["string", "number", "boolean", "integer", "array", "object"])
			.describe("JSON Schema type for this property."),
	})
	.passthrough();

const HTTP_BODY_ERROR =
	'Invalid request body: expected a JSON string such as "{\\"orderId\\":\\"{{payload.orderId}}\\"}", or an array of { key, value } string pairs';

const httpRequestControlSchema = z.object({
	body: z
		.union([z.string().max(65536), z.array(httpKeyValuePairSchema)], {
			error: (issue) => (issue.code === "invalid_union" ? HTTP_BODY_ERROR : undefined),
		})
		.optional()
		.describe(
			"Request body (only for POST/PUT/PATCH): a raw JSON string, or key-value pairs for legacy workflows. Use template variables for dynamic values.",
		),
	continueOnFailure: z
		.boolean()
		.optional()
		.describe(
			"When true, the workflow continues even if this HTTP request step fails. Default: false.",
		),
	enforceSchemaValidation: z
		.boolean()
		.optional()
		.describe(
			"When true, validate the response body against responseBodySchema at runtime. Default: false.",
		),
	headers: z
		.array(httpKeyValuePairSchema)
		.optional()
		.describe(
			"HTTP request headers as key-value pairs. Always include 'Content-Type: application/json' when sending a JSON body.",
		),
	method: httpMethodSchema.describe(
		"HTTP method for the request (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS).",
	),
	responseBodySchema: z
		.object({
			properties: z
				.record(z.string(), httpResponsePropertySchema)
				.optional()
				.describe(
					'JSON Schema properties keyed by response field name, e.g. { "id": { "type": "string" } }.',
				),
			required: z
				.array(z.string())
				.optional()
				.describe("JSON Schema required property names."),
			type: z.string().optional().describe('JSON Schema type keyword (always "object").'),
		})
		.optional()
		.describe(
			"JSON Schema describing the expected HTTP response shape. Defines which properties are available as steps.<http-step-id>.<property> in subsequent steps.",
		),
	skip: optionalSkipConditionSchema,
	timeout: z
		.number()
		.min(100)
		.max(30000)
		.optional()
		.describe(
			"Timeout in milliseconds before the request is aborted (must be 100–30000). Default: 5000.",
		),
	url: z
		.string()
		.describe(
			"Absolute URL for the HTTP request. Supports template variables, e.g. 'https://api.example.com/notify' or '{{payload.webhookUrl}}'.",
		),
});

const customControlSchema = z
	.object({
		skip: optionalSkipConditionSchema,
	})
	.passthrough();

// --- Step schemas (discriminated by `type`) -------------------------------

const baseStepFields = {
	_id: z.string().optional().describe("Unique identifier of the step (omit for new steps)."),
	name: z.string().describe("Human-readable name of the step."),
};

export const workflowStepSchema = z.discriminatedUnion("type", [
	z.object({
		...baseStepFields,
		controlValues: inAppControlSchema,
		type: z.literal("in_app"),
	}),
	z.object({
		...baseStepFields,
		controlValues: emailControlSchema,
		type: z.literal("email"),
	}),
	z.object({
		...baseStepFields,
		controlValues: smsControlSchema,
		type: z.literal("sms"),
	}),
	z.object({
		...baseStepFields,
		controlValues: pushControlSchema,
		type: z.literal("push"),
	}),
	z.object({
		...baseStepFields,
		controlValues: chatControlSchema,
		type: z.literal("chat"),
	}),
	z.object({
		...baseStepFields,
		controlValues: delayControlSchema,
		type: z.literal("delay"),
	}),
	z.object({
		...baseStepFields,
		controlValues: digestControlSchema,
		type: z.literal("digest"),
	}),
	z.object({
		...baseStepFields,
		controlValues: throttleControlSchema,
		type: z.literal("throttle"),
	}),
	z.object({
		...baseStepFields,
		controlValues: httpRequestControlSchema,
		type: z.literal("http_request"),
	}),
	z.object({
		...baseStepFields,
		controlValues: customControlSchema,
		type: z.literal("trigger"),
	}),
	z.object({
		...baseStepFields,
		controlValues: customControlSchema,
		type: z.literal("custom"),
	}),
]);

export type WorkflowStep = z.infer<typeof workflowStepSchema>;

/**
 * Step content for `update_workflow_step_content`: control values keyed on
 * the step `type`. Covers the step types whose content an LLM edits.
 */
export const workflowStepContentSchema = z.discriminatedUnion("type", [
	z.object({ controlValues: inAppControlSchema, type: z.literal("in_app") }),
	z.object({ controlValues: emailControlSchema, type: z.literal("email") }),
	z.object({ controlValues: smsControlSchema, type: z.literal("sms") }),
	z.object({ controlValues: pushControlSchema, type: z.literal("push") }),
	z.object({ controlValues: chatControlSchema, type: z.literal("chat") }),
	z.object({ controlValues: delayControlSchema, type: z.literal("delay") }),
	z.object({ controlValues: digestControlSchema, type: z.literal("digest") }),
	z.object({ controlValues: throttleControlSchema, type: z.literal("throttle") }),
	z.object({
		controlValues: httpRequestControlSchema,
		type: z.literal("http_request"),
	}),
]);

export type WorkflowStepContent = z.infer<typeof workflowStepContentSchema>;

// --- Advertised step inputs ------------------------------------------------

/*
 * The MCP SDK lists a tool's input schema from the input side of a pipe
 * (`pipeStrategy: "input"`) and validates calls through the whole pipe, so a
 * step input advertises free-form controlValues while every call is still
 * parsed by the strict per-type union.
 */

const controlValuesSchemaByStepType = {
	chat: chatControlSchema,
	custom: customControlSchema,
	delay: delayControlSchema,
	digest: digestControlSchema,
	email: emailControlSchema,
	http_request: httpRequestControlSchema,
	in_app: inAppControlSchema,
	push: pushControlSchema,
	sms: smsControlSchema,
	throttle: throttleControlSchema,
	trigger: customControlSchema,
} satisfies Record<StepType, z.ZodType>;

type StepControlValuesInput = {
	[T in StepType]: z.input<(typeof controlValuesSchemaByStepType)[T]>;
};

const STEP_CONTROL_EXAMPLES: StepControlValuesInput = {
	chat: { body: "New signup: {{payload.email}}" },
	custom: {},
	delay: { amount: 30, type: "regular", unit: "minutes" },
	digest: { amount: 1, digestKey: "payload.projectId", type: "regular", unit: "hours" },
	email: {
		body: {
			content: [
				{
					attrs: { level: 2 },
					content: [{ text: "Your order is on its way", type: "text" }],
					type: "heading",
				},
				{
					content: [
						{ text: "Hi ", type: "text" },
						{ attrs: { id: "subscriber.firstName" }, type: "variable" },
						{ text: ", track your order below.", type: "text" },
					],
					type: "paragraph",
				},
				{
					attrs: { isUrlVariable: true, text: "Track order", url: "payload.trackingUrl" },
					type: "button",
				},
			],
			type: "doc",
		},
		editorType: "block",
		subject: "Order {{payload.orderId}} shipped",
	},
	http_request: {
		body: '{"orderId":"{{payload.orderId}}"}',
		headers: [{ key: "Content-Type", value: "application/json" }],
		method: "POST",
		url: "https://api.example.com/hooks/orders",
	},
	in_app: {
		body: "{{payload.author}} commented on your post",
		redirect: { url: "/posts/{{payload.postId}}" },
		subject: "New comment",
	},
	push: { body: "Order {{payload.orderId}} is on its way", subject: "Order shipped" },
	sms: { body: "Your code is {{payload.code}}" },
	throttle: { amount: 1, threshold: 5, type: "fixed", unit: "hours" },
	trigger: {},
};

const STEP_CONTROLS_GUIDE_HEADER =
	"controlValues for the step's type (? marks an optional key; keys not listed are dropped). Write dynamic text as {{payload.x}} or {{subscriber.x}}, never a bare {{x}}.";

const STEP_CONTROLS_GUIDE_TYPES = [
	"- in_app: { subject, body, avatar?, redirect?: { url, target? }, primaryAction?: { label, redirect?: { url, target? } }, secondaryAction? (same shape), data?: {}, disableOutputSanitization? }",
	'- email: { editorType: "html", subject, body: "<p>Hi {{subscriber.firstName}}</p>" } or { editorType: "block", subject, body: { type: "doc", content: [...] } (an object, not a string) }; call get_step_schema for "email" before writing a "block" body. Both take preheader?, layoutId? (null for no layout), from?: { email?, name? }, replyTo?, useProviderDefaults?, disableOutputSanitization?',
	"- sms: { body } (keep it under 160 characters). chat: { body }. push: { subject, body }",
	'- delay: { type: "regular", amount: 30, unit: "minutes" } | { type: "timed", cron: "0 9 * * 1" } | { type: "dynamic", dynamicKey: "payload.sendAt" }, each with extendToSchedule?',
	'- digest: { type: "regular", amount: 1, unit: "hours", digestKey?: "payload.orderId", lookBackWindow?: { amount, unit, extendToSchedule? }, extendToSchedule? } | { type: "timed", cron: "0 9 * * *", digestKey?, extendToSchedule? }',
	'- throttle: { type: "fixed", amount: 1, unit: "hours", threshold: 5, throttleKey? } (unit is minutes, hours or days) | { type: "dynamic", dynamicKey: "payload.windowMs", threshold: 5, throttleKey? }',
	'- http_request: { method: "POST", url, headers?: [{ key, value }], body?: "{\\"id\\":\\"{{payload.id}}\\"}" (a JSON string or [{ key, value }], for POST, PUT and PATCH only), timeout? (100-30000 ms), responseBodySchema?: { type: "object", properties: { <field>: { type } }, required? }, continueOnFailure?, enforceSchemaValidation? }',
];

const STEP_CONTROLS_GUIDE_UNITS =
	"amount and threshold are at least 1; unit is seconds, minutes, hours, days, weeks or months.";

const STEP_CONTROLS_GUIDE = [
	STEP_CONTROLS_GUIDE_HEADER,
	...STEP_CONTROLS_GUIDE_TYPES,
	"- trigger, custom: any keys",
	STEP_CONTROLS_GUIDE_UNITS,
	'Every type also takes skip?, a JSONLogic run condition such as { "==": [{ "var": "subscriber.isOnline" }, false] } or null for none (format on update_workflow_step_conditions).',
].join("\n");

const STEP_CONTENT_CONTROLS_GUIDE = [
	STEP_CONTROLS_GUIDE_HEADER,
	...STEP_CONTROLS_GUIDE_TYPES,
	STEP_CONTROLS_GUIDE_UNITS,
].join("\n");

function kindOf(value: unknown): string {
	if (value === undefined) return "nothing";
	if (value === null) return "null";
	if (Array.isArray(value)) return "an array";

	return `a ${typeof value}`;
}

const controlValuesRecordSchema = z.record(z.string(), z.unknown(), {
	error: (issue) =>
		`Expected controlValues as an object of the step type's keys, received ${kindOf(issue.input)}`,
});

export const workflowStepInputSchema = z
	.object({
		...baseStepFields,
		controlValues: controlValuesRecordSchema.describe(STEP_CONTROLS_GUIDE),
		type: stepTypeSchema,
	})
	.pipe(workflowStepSchema);

const contentStepTypes = stepTypeSchema.exclude(["trigger", "custom"]).options;

/** The content tool keeps the step's saved skip, so a skip sent with the content is dropped unchecked. */
export const workflowStepContentInputSchema = z
	.object({
		controlValues: controlValuesRecordSchema
			.transform(({ skip: _skip, ...controlValues }) => controlValues)
			.describe(STEP_CONTENT_CONTROLS_GUIDE),
		type: z.enum(contentStepTypes, {
			error: `Expected content.type to be one of ${contentStepTypes.join(", ")}; edit trigger and custom steps with update_workflow`,
		}),
	})
	.pipe(workflowStepContentSchema);

// --- get_step_schema -----------------------------------------------------

type JsonObject = Record<string, unknown>;

const MIN_SHARED_DEFINITION_CHARS = 200;

/** A Maily node or mark is named after its `type`; other shared schemas carry a `title` meta. */
function definitionLabel(node: JsonObject): string | undefined {
	if (typeof node.title === "string") return node.title;

	const type = (node.properties as { type?: { enum?: unknown[] } } | undefined)?.type;

	return type?.enum?.length === 1 && typeof type.enum[0] === "string" ? type.enum[0] : undefined;
}

function mapJsonObject(object: JsonObject, map: (value: unknown) => unknown): JsonObject {
	return Object.fromEntries(Object.entries(object).map(([key, value]) => [key, map(value)]));
}

/**
 * Moves every named subschema that occurs more than once, such as a Maily
 * node or the skip condition, into `definitions`, so the email schema lists
 * each node once instead of at every position it can appear.
 */
function extractSharedDefinitions(schema: JsonObject): JsonObject {
	const named = new Map<JsonObject, { label: string; text: string }>();
	const occurrences = new Map<string, number>();
	const collect = (node: unknown): void => {
		if (Array.isArray(node)) {
			for (const item of node) collect(item);
		} else if (node && typeof node === "object") {
			const object = node as JsonObject;
			for (const value of Object.values(object)) collect(value);

			const label = definitionLabel(object);
			if (!label) return;

			const text = JSON.stringify(object);
			if (text.length < MIN_SHARED_DEFINITION_CHARS) return;
			named.set(object, { label, text });
			occurrences.set(text, (occurrences.get(text) ?? 0) + 1);
		}
	};
	collect(schema);

	const definitions = new Map<string, unknown>();
	const namesByText = new Map<string, string>();
	const replace = (node: unknown): unknown => {
		if (Array.isArray(node)) return node.map(replace);
		if (!node || typeof node !== "object") return node;

		const object = node as JsonObject;
		const entry = named.get(object);
		if (!entry || (occurrences.get(entry.text) ?? 0) < 2) {
			return mapJsonObject(object, replace);
		}

		let name = namesByText.get(entry.text);
		if (!name) {
			name = entry.label;
			for (let suffix = 2; definitions.has(name); suffix++) name = `${entry.label}_${suffix}`;
			namesByText.set(entry.text, name);
			// Claimed before the children are replaced, so a nested node with the same label gets another name.
			definitions.set(name, undefined);
			definitions.set(name, mapJsonObject(object, replace));
		}

		return { $ref: `#/definitions/${name}` };
	};

	const extracted = replace(schema) as JsonObject;

	return definitions.size > 0
		? { ...extracted, definitions: Object.fromEntries(definitions) }
		: extracted;
}

const stepControlValuesDescriptions = new Map<StepType, string>();

/** What `get_step_schema` returns for one step type, built once per type. */
export function describeStepControlValues(stepType: StepType): string {
	const cached = stepControlValuesDescriptions.get(stepType);
	if (cached) return cached;

	const schema = extractSharedDefinitions(
		z.toJSONSchema(controlValuesSchemaByStepType[stepType], { io: "input", target: "draft-7" }),
	);
	const description = JSON.stringify({
		example: STEP_CONTROL_EXAMPLES[stepType],
		...(stepType === "email" && { notes: MAILY_BODY_GUIDE }),
		schema,
		stepType,
	});
	stepControlValuesDescriptions.set(stepType, description);

	return description;
}
