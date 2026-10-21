import { z } from "zod";
import { mailyBodySchema } from "./maily-schemas";
import { createSkipConditionSchema } from "./skip-schemas";

/**
 * Workflow step schemas — one discriminated union member per Novu step type.
 *
 * Step-related enums live here (not in workflow-schemas.ts) so that
 * workflow-schemas.ts can import `workflowStepSchema` from this file
 * without creating a circular dependency.
 *
 * Each control-value sub-schema is built via a `createXSchema()` factory so
 * shared sub-schemas (e.g. skip conditions) are emitted as inline Zod
 * objects rather than shared `$ref`s — important for MCP clients that
 * struggle with deep `$defs` chains.
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

export const delayTypeSchema = z.enum(["regular", "timed"]);
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

function createRedirectSchema() {
	return z.object({
		target: redirectTargetSchema
			.optional()
			.describe('Redirect target. Use "_self" for same window (default).'),
		url: z
			.string()
			.describe(
				'Redirect URL accepts absolute "https://" or "/" relative paths. Dynamic values MUST be wrapped in double curly braces, e.g. "{{ payload.url }}". Must not start with "mailto:".',
			),
	});
}

function createActionSchema() {
	return z.object({
		label: z.string().describe("Label for the action button."),
		redirect: createRedirectSchema()
			.optional()
			.describe("Redirect configuration for the action."),
	});
}

// --- Per-channel control schemas (factories) ------------------------------

function createInAppControlSchema() {
	return z.object({
		avatar: z
			.string()
			.optional()
			.describe(
				"Avatar image URL for the in-app notification. Must be an absolute https:// URL or a /relative path.",
			),
		body: z.string().describe("In-app notification body."),
		disableOutputSanitization: z
			.boolean()
			.optional()
			.describe("Disable sanitization of the in-app output."),
		primaryAction: createActionSchema()
			.optional()
			.describe("Primary action button for the in-app notification."),
		redirect: createRedirectSchema()
			.optional()
			.describe(
				"Redirect configuration applied for the in-app notification action when the in-app notification is clicked.",
			),
		secondaryAction: createActionSchema()
			.optional()
			.describe("Secondary action button for the in-app notification."),
		skip: createSkipConditionSchema(),
		subject: z.string().describe("In-app notification title."),
	});
}

function createSmsControlSchema() {
	return z.object({
		body: z
			.string()
			.describe(
				"SMS message body (non-empty). Keep messages under 160 characters to avoid splitting.",
			),
		skip: createSkipConditionSchema(),
	});
}

function createPushControlSchema() {
	return z.object({
		body: z
			.string()
			.describe(
				"Push notification body (non-empty). Body should be under 150 characters for full visibility.",
			),
		skip: createSkipConditionSchema(),
		subject: z
			.string()
			.describe(
				"Push notification title (non-empty). Title (subject) should be under 50 characters (gets truncated on most devices).",
			),
	});
}

function createChatControlSchema() {
	return z.object({
		body: z
			.string()
			.describe("Chat message body (non-empty). Be specific about what the user should do."),
		skip: createSkipConditionSchema(),
	});
}

function createEmailBlockControlSchema() {
	return z.object({
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
		skip: createSkipConditionSchema(),
		subject: z.string().describe("Email subject line."),
	});
}

function createEmailHtmlControlSchema() {
	return z.object({
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
		skip: createSkipConditionSchema(),
		subject: z.string().describe("Email subject line."),
	});
}

function createEmailControlSchema() {
	return z.discriminatedUnion("editorType", [
		createEmailBlockControlSchema(),
		createEmailHtmlControlSchema(),
	]);
}

function createDelayRegularControlSchema() {
	return z.object({
		amount: z.number().min(1).describe("Amount of time to delay (must be >= 1)."),
		skip: createSkipConditionSchema(),
		type: z.literal("regular").describe('Regular delay type ("wait for amount + unit").'),
		unit: timeUnitSchema.describe("Time unit for the delay."),
	});
}

function createDelayTimedControlSchema() {
	return z.object({
		cron: z.string().describe("Cron expression for the timed delay (non-empty)."),
		skip: createSkipConditionSchema(),
		type: z.literal("timed").describe('Timed delay type ("wait until cron schedule").'),
	});
}

function createDelayControlSchema() {
	return z.discriminatedUnion("type", [
		createDelayRegularControlSchema(),
		createDelayTimedControlSchema(),
	]);
}

function createDigestRegularControlSchema() {
	return z.object({
		amount: z.number().min(1).describe("Amount of time for the digest window (must be >= 1)."),
		digestKey: z
			.string()
			.optional()
			.describe(
				"Variable path to group notifications by, e.g. 'payload.orderId'. Omit to group across all events for the subscriber.",
			),
		extendToSchedule: z
			.boolean()
			.optional()
			.describe("Extend the digest window to the schedule."),
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
		skip: createSkipConditionSchema(),
		type: z
			.literal("regular")
			.describe(
				"Regular digest. Groups events within the configured time window starting from the first event.",
			),
		unit: timeUnitSchema.describe("Time unit for the digest window."),
	});
}

function createDigestTimedControlSchema() {
	return z.object({
		cron: z.string().describe("Cron expression for the timed digest (non-empty)."),
		digestKey: z.string().optional().describe("Variable path to group notifications by."),
		extendToSchedule: z
			.boolean()
			.optional()
			.describe("Extend the digest window to the schedule."),
		skip: createSkipConditionSchema(),
		type: z
			.literal("timed")
			.describe(
				"Timed digest. Collects events until a specific scheduled time (UTC), then continues with all collected events.",
			),
	});
}

function createDigestControlSchema() {
	return z.discriminatedUnion("type", [
		createDigestRegularControlSchema(),
		createDigestTimedControlSchema(),
	]);
}

function createThrottleFixedControlSchema() {
	return z.object({
		amount: z
			.number()
			.min(1)
			.describe("Amount of time for the throttle window (must be >= 1)."),
		skip: createSkipConditionSchema(),
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
		unit: timeUnitSchema.describe("Time unit for the throttle window."),
	});
}

function createThrottleDynamicControlSchema() {
	return z.object({
		dynamicKey: z
			.string()
			.describe(
				"Variable path that resolves the dynamic throttle window at runtime, e.g. 'payload.windowMs'.",
			),
		skip: createSkipConditionSchema(),
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
}

function createThrottleControlSchema() {
	return z.discriminatedUnion("type", [
		createThrottleFixedControlSchema(),
		createThrottleDynamicControlSchema(),
	]);
}

function createHttpKeyValuePairSchema() {
	return z.object({
		key: z.string().min(1).describe("Header or body key (non-empty)."),
		value: z
			.string()
			.describe("Header or body value. Use {{payload.variableName}} for dynamic values."),
	});
}

function createHttpResponsePropertySchema() {
	return z.object({
		name: z.string().describe("Response property name."),
		type: z
			.enum(["string", "number", "boolean", "integer", "array", "object"])
			.describe("JSON Schema type for this property."),
	});
}

function createHttpRequestControlSchema() {
	return z.object({
		body: z
			.array(createHttpKeyValuePairSchema())
			.optional()
			.describe(
				"Request body as key-value pairs (only for POST/PUT/PATCH). Use template variables for dynamic values.",
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
			.array(createHttpKeyValuePairSchema())
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
					.array(createHttpResponsePropertySchema())
					.optional()
					.describe("Response properties as name+type pairs."),
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
		skip: createSkipConditionSchema(),
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
}

function createCustomControlSchema() {
	return z
		.object({
			skip: createSkipConditionSchema(),
		})
		.passthrough();
}

// --- Step schemas (discriminated by `type`) -------------------------------

function createBaseStepFields() {
	return {
		_id: z.string().optional().describe("Unique identifier of the step (omit for new steps)."),
		name: z.string().describe("Human-readable name of the step."),
	};
}

export const workflowStepSchema = z.discriminatedUnion("type", [
	z.object({
		...createBaseStepFields(),
		controlValues: createInAppControlSchema(),
		type: z.literal("in_app"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createEmailControlSchema(),
		type: z.literal("email"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createSmsControlSchema(),
		type: z.literal("sms"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createPushControlSchema(),
		type: z.literal("push"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createChatControlSchema(),
		type: z.literal("chat"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createDelayControlSchema(),
		type: z.literal("delay"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createDigestControlSchema(),
		type: z.literal("digest"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createThrottleControlSchema(),
		type: z.literal("throttle"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createHttpRequestControlSchema(),
		type: z.literal("http_request"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createCustomControlSchema(),
		type: z.literal("trigger"),
	}),
	z.object({
		...createBaseStepFields(),
		controlValues: createCustomControlSchema(),
		type: z.literal("custom"),
	}),
]);

export type WorkflowStep = z.infer<typeof workflowStepSchema>;
