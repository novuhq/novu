import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types";
import {
	addPayloadProperty,
	createEmptyPayloadSchema,
	hasPayloadProperties,
	removePayloadProperty,
} from "../utils/payload-schema";
import { toSlugIdentifier } from "../utils/slug";
import type { ToolAccessors } from "../utils/tool-accessors";
import { type ToolContext, type ToolErrorDetails, ToolFactory } from "../utils/tool-factory";
import {
	normalizeControlValues,
	toUpdateWorkflowRequest,
	type UpdateWorkflowRequest,
	type WorkflowResponse,
	type WorkflowStepRequest,
} from "../utils/workflow-request";
import { apiError, workflowResult } from "../utils/workflow-results";
import {
	createSkipConditionSchema,
	createWorkflowSourceInputSchema,
	MAX_DESCRIPTION_LENGTH,
	MAX_NAME_LENGTH,
	MAX_TAG_ELEMENTS,
	MAX_TAG_LENGTH,
	payloadPropertySchema,
	severitySchema,
	type WorkflowStep,
	workflowStepContentSchema,
	workflowStepSchema,
} from "../utils/workflow-schemas";
import { WorkflowValidationUtils } from "../utils/workflow-validation";

export const WORKFLOW_STEP_TOOL_NAMES = {
	ADD_STEP: "add_workflow_step",
	INSERT_STEP: "insert_workflow_step",
	MOVE_STEP: "move_workflow_step",
	REMOVE_STEP: "remove_workflow_step",
	UPDATE_METADATA: "update_workflow_metadata",
	UPDATE_PAYLOAD_SCHEMA: "update_workflow_payload_schema",
	UPDATE_STEP_CONDITIONS: "update_workflow_step_conditions",
	UPDATE_STEP_CONTENT: "update_workflow_step_content",
} as const;

const PAYLOAD_SCHEMA_REMINDER =
	"This tool does not change the payload schema: after adding or changing {{payload.*}} variables, call update_workflow_payload_schema to declare them.";

const workflowIdField = z
	.string()
	.describe("The workflow to change: its workflowId (slug) or _id, from get_workflows.");

function createNewStepFields() {
	return {
		__source: createWorkflowSourceInputSchema(),
		step: workflowStepSchema.describe("The step to add, discriminated by `type`."),
		stepId: z
			.string()
			.optional()
			.describe(
				"Optional stable step identifier (slugified). Generated from the step name when omitted.",
			),
		workflowId: workflowIdField,
	};
}

/** What a step tool decides after reading the current workflow. */
type Mutation =
	| { request: UpdateWorkflowRequest; message: string }
	| { unchanged: string }
	| { error: ToolErrorDetails };

export function registerWorkflowStepTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		description: `Append a step to the end of an existing workflow. Returns the saved workflow. Pass stepId to make retries safe: if a step with that stepId already exists, the workflow is returned unchanged. ${PAYLOAD_SCHEMA_REMINDER}`,
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request, workflow) => {
				if (input.stepId && findStepIndex(request, input.stepId, workflow) !== -1) {
					return { unchanged: `Step "${input.stepId}" already exists` };
				}

				const step = newStep(input.step, input.stepId);
				if ("error" in step) return step;

				return {
					message: `Added step "${input.step.name}"`,
					request: { ...request, steps: [...request.steps, step] },
				};
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.ADD_STEP,
		schema: z.object(createNewStepFields()),
	});

	ToolFactory.createTool(server, accessors, {
		description: `Insert a step into an existing workflow immediately after the step afterStepId. Returns the saved workflow. Pass stepId to make retries safe: if a step with that stepId already exists, the workflow is returned unchanged. ${PAYLOAD_SCHEMA_REMINDER}`,
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request, workflow) => {
				if (input.stepId && findStepIndex(request, input.stepId, workflow) !== -1) {
					return { unchanged: `Step "${input.stepId}" already exists` };
				}

				const after = locateStep(request, workflow, input.afterStepId);
				if ("error" in after) return after;

				const step = newStep(input.step, input.stepId);
				if ("error" in step) return step;

				const steps = [...request.steps];
				steps.splice(after.index + 1, 0, step);

				return {
					message: `Inserted step "${input.step.name}" after "${input.afterStepId}"`,
					request: { ...request, steps },
				};
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.INSERT_STEP,
		schema: z.object({
			...createNewStepFields(),
			afterStepId: z
				.string()
				.describe("stepId of the existing step the new step goes after."),
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description: `Replace the content (control values) of one existing step. content.type must match the step's type. The step's name, id and skip conditions are kept; use update_workflow_step_conditions to change conditions. Returns the saved workflow. ${PAYLOAD_SCHEMA_REMINDER}`,
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request, workflow) => {
				const located = locateStep(request, workflow, input.stepId, { editable: true });
				if ("error" in located) return located;

				const { index } = located;
				const current = request.steps[index];
				if (current.type !== input.content.type) {
					return badRequest(
						`Step "${input.stepId}" is a ${current.type} step; content.type is ${input.content.type}.`,
					);
				}

				const invalid = WorkflowValidationUtils.validateWorkflowSteps([
					{ ...input.content, name: current.name } as WorkflowStep,
				]);
				if (invalid) return { error: { message: invalid.content[0].text, status: 400 } };

				const controlValues = normalizeControlValues(
					current.type,
					input.content.controlValues,
				);
				delete controlValues.skip;
				if (current.controlValues.skip !== undefined) {
					controlValues.skip = current.controlValues.skip;
				}

				return {
					message: `Updated content of step "${input.stepId}"`,
					request: replaceStep(request, index, { ...current, controlValues }),
				};
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.UPDATE_STEP_CONTENT,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			content: workflowStepContentSchema.describe(
				"New control values, discriminated by the step `type`.",
			),
			stepId: z.string().describe("stepId of the step to edit."),
			workflowId: workflowIdField,
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Set or clear the skip condition of one step (e.g. only send when the subscriber is offline). Omit skip to remove the condition. The step's content is kept. Returns the saved workflow.",
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request, workflow) => {
				const located = locateStep(request, workflow, input.stepId, { editable: true });
				if ("error" in located) return located;

				const { index } = located;
				const current = request.steps[index];
				const { skip: _previous, ...controlValues } = current.controlValues;
				if (input.skip) controlValues.skip = input.skip;

				return {
					message: `${input.skip ? "Updated" : "Removed"} conditions of step "${input.stepId}"`,
					request: replaceStep(request, index, { ...current, controlValues }),
				};
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.UPDATE_STEP_CONDITIONS,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			skip: createSkipConditionSchema(),
			stepId: z.string().describe("stepId of the step to update."),
			workflowId: workflowIdField,
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Remove one step from a workflow. Returns the saved workflow. Payload variables only that step used stay in the payload schema; remove them with update_workflow_payload_schema if they are no longer needed.",
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request, workflow) => {
				const located = locateStep(request, workflow, input.stepId);
				if ("error" in located) return located;

				return {
					message: `Removed step "${input.stepId}"`,
					request: {
						...request,
						steps: request.steps.filter((_, i) => i !== located.index),
					},
				};
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.REMOVE_STEP,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			stepId: z.string().describe("stepId of the step to remove."),
			workflowId: workflowIdField,
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Move one step to a new 0-based position in the workflow. Indexes past the end move it to the last position. Returns the saved workflow.",
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request, workflow) => {
				const located = locateStep(request, workflow, input.stepId);
				if ("error" in located) return located;

				const steps = [...request.steps];
				const [step] = steps.splice(located.index, 1);
				steps.splice(Math.min(input.toIndex, steps.length), 0, step);

				return {
					message: `Moved step "${input.stepId}" to position ${input.toIndex}`,
					request: { ...request, steps },
				};
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.MOVE_STEP,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			stepId: z.string().describe("stepId of the step to move."),
			toIndex: z.number().int().min(0).describe("Target 0-based position (>= 0)."),
			workflowId: workflowIdField,
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Add, update or remove properties in the workflow's payload JSON Schema. The step tools never change it, so call this after adding or changing {{payload.*}} variables in step content, or when the user describes the trigger payload. Use dot notation for nested properties. Payload validation is turned on while the schema has properties. Returns the saved workflow.",
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request) => {
				const schema = structuredClone(request.payloadSchema ?? createEmptyPayloadSchema());
				for (const path of input.removeProperties ?? [])
					removePayloadProperty(schema, path);
				for (const property of input.addProperties ?? [])
					addPayloadProperty(schema, property);

				return {
					message: "Updated the payload schema",
					request: {
						...request,
						payloadSchema: schema,
						validatePayload: hasPayloadProperties(schema),
					},
				};
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.UPDATE_PAYLOAD_SCHEMA,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			addProperties: z
				.array(payloadPropertySchema)
				.optional()
				.describe("Properties to add or replace."),
			removeProperties: z
				.array(z.string())
				.optional()
				.describe("Property paths to remove (dot notation for nested)."),
			workflowId: workflowIdField,
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Change a workflow's name, description, tags, severity or criticality. Omitted fields stay as they are; steps, preferences and the payload schema are kept. critical: true delivers regardless of subscriber preferences. Returns the saved workflow.",
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request) => {
				const { critical, description, name, severity, tags } = input;
				const updated: UpdateWorkflowRequest = {
					...request,
					...(description !== undefined && { description }),
					...(name !== undefined && { name }),
					...(severity !== undefined && { severity }),
					...(tags !== undefined && { tags }),
				};
				if (critical !== undefined) {
					updated.preferences = {
						...request.preferences,
						user: criticalPreferences(critical, request),
					};
				}

				return { message: "Updated workflow metadata", request: updated };
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.UPDATE_METADATA,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			critical: z
				.boolean()
				.optional()
				.describe(
					"true delivers regardless of subscriber preferences (security, account notices); false lets subscribers opt out again.",
				),
			description: z
				.string()
				.max(MAX_DESCRIPTION_LENGTH)
				.optional()
				.describe(`New description (max ${MAX_DESCRIPTION_LENGTH} characters).`),
			name: z
				.string()
				.min(1)
				.max(MAX_NAME_LENGTH)
				.optional()
				.describe(`New name (max ${MAX_NAME_LENGTH} characters).`),
			severity: severitySchema.optional().describe("New severity."),
			tags: z
				.array(z.string().max(MAX_TAG_LENGTH))
				.max(MAX_TAG_ELEMENTS)
				.optional()
				.describe(`Replacement tags (max ${MAX_TAG_ELEMENTS}).`),
			workflowId: workflowIdField,
		}),
	});
}

const CRITICAL_CHANNELS = ["in_app", "email", "sms", "push", "chat", "tool"] as const;

/** Subscriber-level preferences: read-only and all channels on when critical. */
function criticalPreferences(
	critical: boolean,
	request: UpdateWorkflowRequest,
): Record<string, unknown> | null {
	if (critical) {
		return {
			all: { enabled: true, readOnly: true },
			channels: Object.fromEntries(CRITICAL_CHANNELS.map((c) => [c, { enabled: true }])),
		};
	}

	const user = request.preferences.user as { all?: Record<string, unknown> } | null | undefined;
	if (!user) return null;

	return { ...user, all: { ...user.all, readOnly: false } };
}

async function mutateWorkflow(
	context: ToolContext,
	input: { workflowId: string; __source?: string },
	mutate: (request: UpdateWorkflowRequest, workflow: WorkflowResponse) => Mutation,
): Promise<ApiResponse> {
	const endpoint = `/v2/workflows/${encodeURIComponent(input.workflowId)}`;
	const fetched = await ToolFactory.callApi(context, { endpoint, method: "GET" });
	if (!fetched.ok) return apiError("fetch workflow", input.workflowId, fetched);

	const workflow = fetched.data as WorkflowResponse;
	const outcome = mutate(toUpdateWorkflowRequest(workflow), workflow);
	if ("error" in outcome) return ToolFactory.errorResult(outcome.error);
	if ("unchanged" in outcome) return workflowResult(outcome.unchanged, workflow);

	const body = input.__source
		? { ...outcome.request, __source: input.__source }
		: outcome.request;
	const saved = await ToolFactory.callApi(
		context,
		{ body, endpoint, method: "PUT" },
		context.idempotencyKey,
	);
	if (!saved.ok) return apiError("update workflow", input.workflowId, saved);

	return workflowResult(outcome.message, saved.data);
}

function badRequest(message: string): { error: ToolErrorDetails } {
	return { error: { message: `Error: ${message}`, status: 400 } };
}

function replaceStep(
	request: UpdateWorkflowRequest,
	index: number,
	step: WorkflowStepRequest,
): UpdateWorkflowRequest {
	const steps = [...request.steps];
	steps[index] = step;

	return { ...request, steps };
}

/**
 * Index of `stepId` in the request. An exact match on the workflow's own step
 * id wins (a legacy `Email Step` and a newer `email-step` both slugify to the
 * same request id); otherwise the caller's id is slugified like `toStepRequest`
 * does, so an id read back from get_workflow still finds its step.
 */
function findStepIndex(
	request: UpdateWorkflowRequest,
	stepId: string,
	workflow: WorkflowResponse,
): number {
	const exact = workflow.steps.findIndex((step) => step.stepId === stepId);
	if (exact !== -1) return exact;

	const slug = toSlugIdentifier(stepId);

	return request.steps.findIndex((step) => step.stepId === slug);
}

/**
 * The step a tool targets, or the error to return. Steps backed by a deployed
 * step resolver are edited in code, so `editable` tools refuse them.
 */
function locateStep(
	request: UpdateWorkflowRequest,
	workflow: WorkflowResponse,
	stepId: string,
	{ editable = false }: { editable?: boolean } = {},
): { index: number } | { error: ToolErrorDetails } {
	const index = findStepIndex(request, stepId, workflow);
	if (index === -1) {
		return {
			error: { message: `Error: Step "${stepId}" not found in workflow.`, status: 404 },
		};
	}

	if (editable && workflow.steps[index]?.stepResolverHash) {
		return badRequest(`Step "${stepId}" is managed by a step resolver and cannot be edited.`);
	}

	return { index };
}

function newStep(
	step: WorkflowStep,
	stepId: string | undefined,
): WorkflowStepRequest | { error: ToolErrorDetails } {
	const invalid = WorkflowValidationUtils.validateWorkflowSteps([step]);
	if (invalid) return { error: { message: invalid.content[0].text, status: 400 } };

	const request: WorkflowStepRequest = {
		controlValues: normalizeControlValues(step.type, step.controlValues),
		name: step.name,
		type: step.type,
	};
	if (stepId) request.stepId = toSlugIdentifier(stepId);

	return request;
}
