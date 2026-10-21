import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { toSlugIdentifier } from "../utils/slug";
import type { ToolAccessors } from "../utils/tool-accessors";
import { type ApiCallResult, type ToolContext, ToolFactory } from "../utils/tool-factory";
import { normalizeControlValues } from "../utils/workflow-request";
import { apiError, workflowResult } from "../utils/workflow-results";
import {
	createWorkflowInputSchema,
	payloadPropertiesToJsonSchema,
	triggerWorkflowInputSchema,
	updateWorkflowInputSchema,
	type WorkflowStep,
} from "../utils/workflow-schemas";
import { WorkflowValidationUtils } from "../utils/workflow-validation";
import { registerWorkflowStepTools } from "./workflow-steps";

const AGENT_ASSIGNMENT_GUIDE = [
	'To assign an agent: call get_agents, then pass agent: { identifier: "<slug>" } (not Mongo _id).',
	"Pass agent: null to unassign. Omit agent on update to leave the current assignment unchanged.",
].join(" ");

const STEP_TYPE_GUIDE = [
	"Supported step types (set via `type` discriminator on each step):",
	"- in_app: subject + body",
	"- email: discriminated by editorType — 'block' (body = Maily TipTap JSON) or 'html' (body = HTML string)",
	"- sms: body (keep under 160 chars)",
	"- push: subject + body",
	"- chat: body",
	"- delay: discriminated by type — 'regular' (amount + unit) or 'timed' (cron)",
	"- digest: discriminated by type — 'regular' (amount + unit + optional digestKey) or 'timed' (cron + optional digestKey)",
	"- throttle: discriminated by type — 'fixed' (amount + unit + threshold) or 'dynamic' (dynamicKey + threshold)",
	"- http_request: method + url + optional headers/body key-value pairs",
	"- trigger / custom: passthrough",
	"Always use {{payload.variableName}} syntax (NOT {{variableName}}) for dynamic content.",
	'Skip conditions are JSONLogic objects on `controlValues.skip`, e.g. { "==": [{ "var": "subscriber.isOnline" }, true] }.',
].join("\n");

export function registerWorkflowTools(server: McpServer, accessors: ToolAccessors) {
	// Get all workflows - simple GET endpoint
	ToolFactory.createGetTool(
		server,
		accessors,
		"get_workflows",
		"Get all available workflows from your Novu application with their basic information and identifiers",
		"/v2/workflows",
		"fetched workflows",
	);

	// Get specific workflow by ID - simple GET by ID
	ToolFactory.createGetByIdTool(
		server,
		accessors,
		"get_workflow",
		"Get detailed information about a specific workflow including its steps, channels, payload structure, and configuration",
		"/v2/workflows/{id}",
		"fetched workflow",
		"workflowId",
		"The workflow ID to retrieve (obtained from get_workflows)",
	);

	// Trigger workflow - custom logic using the factory
	ToolFactory.createTool(server, accessors, {
		description:
			"Trigger a workflow to send notifications to a subscriber with custom payload data",
		handler: ToolFactory.handleTriggerWorkflow,
		name: "trigger_workflow",
		schema: triggerWorkflowInputSchema,
	});

	// Create workflow - complex validation and POST
	ToolFactory.createTool(server, accessors, {
		description: `Create a new workflow in Novu with comprehensive configuration including steps, preferences, and validation.\n\n${AGENT_ASSIGNMENT_GUIDE}\n\n${STEP_TYPE_GUIDE}`,
		handler: async (input, context) => {
			const resolvedPayloadSchema = resolvePayloadSchema(input);
			const steps = input.steps ?? [];
			const stepValidationError = WorkflowValidationUtils.validateWorkflowSteps(steps, {
				payloadSchema: resolvedPayloadSchema,
			});
			if (stepValidationError) return stepValidationError;

			const workflowId = input.workflowId ?? toSlugIdentifier(input.name, "workflow");
			console.log(`Creating workflow "${input.name}" with ID "${workflowId}"`);

			const requestBody: Record<string, unknown> = {
				__source: input.__source ?? "editor",
				active: input.active ?? false,
				isTranslationEnabled: input.isTranslationEnabled ?? false,
				name: input.name,
				steps: steps.map(toStepBody),
				workflowId,
			};

			assignOptional(requestBody, {
				agent: input.agent,
				critical: input.critical,
				description: input.description,
				payloadSchema: resolvedPayloadSchema,
				preferences: input.preferences,
				severity: input.severity,
				tags: input.tags,
				validatePayload: input.validatePayload,
			});

			const created = await postWorkflow(context, requestBody, {
				retryTakenSlug: input.workflowId === undefined,
			});
			if (!created.ok) return apiError("create workflow", workflowId, created);

			return workflowResult(
				`Successfully created workflow ${created.workflowId}`,
				created.data,
			);
		},
		name: "create_workflow",
		schema: createWorkflowInputSchema,
	});

	// Update workflow - complex validation and PUT
	ToolFactory.createTool(server, accessors, {
		description: `Update an existing workflow in Novu with comprehensive configuration including steps, preferences, and validation.\n\n${AGENT_ASSIGNMENT_GUIDE}\n\n${STEP_TYPE_GUIDE}`,
		handler: async (input, context) => {
			console.log(`Updating workflow "${input.workflowId}" with name "${input.name}"`);

			const resolvedPayloadSchema = resolvePayloadSchema(input);
			const stepValidationError = WorkflowValidationUtils.validateWorkflowSteps(input.steps, {
				payloadSchema: resolvedPayloadSchema,
			});
			if (stepValidationError) return stepValidationError;

			const requestBody: Record<string, unknown> = {
				active: input.active ?? false,
				isTranslationEnabled: input.isTranslationEnabled ?? false,
				name: input.name,
				origin: input.origin,
				preferences: input.preferences,
				steps: input.steps.map(toStepBody),
			};

			assignOptional(requestBody, {
				__source: input.__source,
				agent: input.agent,
				critical: input.critical,
				description: input.description,
				payloadSchema: resolvedPayloadSchema,
				severity: input.severity,
				tags: input.tags,
				validatePayload: input.validatePayload,
			});

			const saved = await ToolFactory.callApi(
				context,
				{
					body: requestBody,
					endpoint: `/v2/workflows/${encodeURIComponent(input.workflowId)}`,
					method: "PUT",
				},
				context.idempotencyKey,
			);
			if (!saved.ok) return apiError("update workflow", input.workflowId, saved);

			return workflowResult(`Successfully updated workflow ${input.workflowId}`, saved.data);
		},
		name: "update_workflow",
		schema: updateWorkflowInputSchema,
	});

	// Cancel a triggered event by transactionId
	ToolFactory.createDeleteTool(
		server,
		accessors,
		"cancel_triggered_event",
		"Cancel a pending triggered event (e.g. a delayed or digest notification that hasn't been sent yet) using its transactionId. The transactionId is returned when you trigger a workflow.",
		"/v1/events/trigger/{id}",
		"cancelled triggered event",
		"transactionId",
		"The transactionId of the triggered event to cancel (returned from trigger_workflow)",
	);

	// Bulk trigger workflows
	ToolFactory.createTool(server, accessors, {
		description:
			"Trigger multiple workflows in a single API call. Each event in the array specifies a workflow name, subscriber, and payload. Useful for batch notification operations.",
		handler: async (input, context) => {
			const events = input.events.map((event) => ({
				name: event.name,
				payload: event.payload,
				to: typeof event.to === "string" ? { subscriberId: event.to } : event.to,
				...(event.overrides && { overrides: event.overrides }),
			}));

			return ToolFactory.makeApiRequest(
				context,
				{
					body: { events },
					endpoint: "/v1/events/trigger/bulk",
					method: "POST",
					successMessage: `bulk triggered ${events.length} workflow(s)`,
				},
				context.idempotencyKey,
			);
		},
		name: "bulk_trigger_workflow",
		schema: z.object({
			events: z
				.array(
					z.object({
						name: z.string().describe("The workflow name/identifier to trigger"),
						overrides: z
							.object({
								chat: z.object({ integrationIdentifier: z.string() }).optional(),
								email: z.object({ integrationIdentifier: z.string() }).optional(),
								in_app: z.object({ integrationIdentifier: z.string() }).optional(),
								push: z.object({ integrationIdentifier: z.string() }).optional(),
								sms: z.object({ integrationIdentifier: z.string() }).optional(),
							})
							.optional()
							.describe("Channel-specific integration overrides"),
						payload: z
							.record(z.any())
							.describe("The payload data for this workflow trigger"),
						to: z
							.union([
								z.string().describe("A single subscriberId"),
								z
									.object({ subscriberId: z.string() })
									.describe("A subscriber object with subscriberId"),
							])
							.describe("The subscriber to send to"),
					}),
				)
				.min(1)
				.describe("Array of workflow trigger events"),
		}),
	});

	// Delete workflow - simple DELETE by ID
	ToolFactory.createDeleteTool(
		server,
		accessors,
		"delete_workflow",
		"Delete an existing workflow from Novu by its unique identifier. This action is irreversible.",
		"/v2/workflows/{id}",
		"deleted workflow",
		"workflowId",
		"The unique identifier of the workflow to delete",
	);

	registerWorkflowStepTools(server, accessors);
}

interface PayloadInputs {
	payloadSchema?: Record<string, unknown>;
	payloadProperties?: z.infer<typeof createWorkflowInputSchema>["payloadProperties"];
}

function resolvePayloadSchema(input: PayloadInputs): Record<string, unknown> | undefined {
	if (input.payloadSchema) return input.payloadSchema;
	if (input.payloadProperties && input.payloadProperties.length > 0) {
		return payloadPropertiesToJsonSchema(input.payloadProperties);
	}

	return undefined;
}

function assignOptional(target: Record<string, unknown>, values: Record<string, unknown>): void {
	for (const [key, value] of Object.entries(values)) {
		if (value !== undefined) target[key] = value;
	}
}

/** Request body for one step: email bodies are sent as strings. */
function toStepBody(step: WorkflowStep): Record<string, unknown> {
	return { ...step, controlValues: normalizeControlValues(step.type, step.controlValues) };
}

const SLUG_ATTEMPTS = 3;

/**
 * POST /v2/workflows. When the workflowId was derived from the name and the
 * API answers 409, retry with a short suffix. A 409 with `Retry-After` is the
 * idempotency interceptor saying the same key is still in progress, so it is
 * returned as is. Each retry sends its own idempotency key, derived from the
 * caller's, and the suffix is derived from that key too: a caller retrying
 * the whole tool call with the same key replays the same requests.
 */
async function postWorkflow(
	context: ToolContext,
	body: Record<string, unknown>,
	{ retryTakenSlug }: { retryTakenSlug: boolean },
): Promise<ApiCallResult & { workflowId: string }> {
	const baseId = body.workflowId as string;
	let result: ApiCallResult | undefined;
	let workflowId = baseId;

	for (let attempt = 0; attempt < SLUG_ATTEMPTS; attempt++) {
		const key =
			attempt === 0 ? context.idempotencyKey : retryKey(context.idempotencyKey, attempt);
		workflowId = attempt === 0 ? baseId : `${baseId}-${slugSuffix(key)}`;
		result = await ToolFactory.callApi(
			context,
			{ body: { ...body, workflowId }, endpoint: "/v2/workflows", method: "POST" },
			key,
		);

		const slugTaken = !result.ok && result.status === 409 && !result.retryAfter;
		if (!slugTaken || !retryTakenSlug) break;
	}

	return { ...(result as ApiCallResult), workflowId };
}

function retryKey(key: string | undefined, attempt: number): string | undefined {
	return key ? `${key.slice(0, 240)}:slug-${attempt}` : undefined;
}

/** 6 base-36 characters: a hash of the idempotency key, else random. */
function slugSuffix(seed: string | undefined): string {
	if (!seed) {
		return Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) =>
			(b % 36).toString(36),
		).join("");
	}

	let hash = 0x811c9dc5;
	for (let i = 0; i < seed.length; i++) {
		hash = Math.imul(hash ^ seed.charCodeAt(i), 0x01000193) >>> 0;
	}

	return hash.toString(36).padStart(6, "0").slice(-6);
}
