import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types";
import {
	addPayloadProperty,
	createEmptyPayloadSchema,
	hasPayloadProperties,
	type PayloadProperty,
	removePayloadProperty,
	toPayloadPropertyPath,
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
	withCriticalPreferences,
} from "../utils/workflow-request";
import { apiError, workflowResult } from "../utils/workflow-results";
import {
	createPropertyPathSchema,
	createWorkflowSourceInputSchema,
	describeStepControlValues,
	MAX_DESCRIPTION_LENGTH,
	MAX_NAME_LENGTH,
	MAX_TAG_ELEMENTS,
	MAX_TAG_LENGTH,
	payloadPropertyInputSchema,
	severitySchema,
	skipConditionInputSchema,
	stepTypeSchema,
	type WorkflowStep,
	workflowStepContentInputSchema,
	workflowStepInputSchema,
} from "../utils/workflow-schemas";
import { WorkflowValidationUtils } from "../utils/workflow-validation";

export const WORKFLOW_STEP_TOOL_NAMES = {
	ADD_STEP: "add_workflow_step",
	GET_STEP_SCHEMA: "get_step_schema",
	INSERT_STEP: "insert_workflow_step",
	MOVE_STEP: "move_workflow_step",
	REMOVE_STEP: "remove_workflow_step",
	UPDATE_METADATA: "update_workflow_metadata",
	UPDATE_PAYLOAD_SCHEMA: "update_workflow_payload_schema",
	UPDATE_STEP_CONDITIONS: "update_workflow_step_conditions",
	UPDATE_STEP_CONTENT: "update_workflow_step_content",
} as const;

const PAYLOAD_SCHEMA_REMINDER =
	"The payload schema is never inferred from the step: declare the payload variables it reads that the schema lacks (orderId for {{payload.orderId}}) in addPayloadProperties to save them with the step, or call update_workflow_payload_schema afterwards.";

export const STEP_SCHEMA_HINT =
	"The controlValues field lists each step type's keys; get_step_schema returns a type's full schema and a valid example.";

const workflowIdField = z
	.string()
	.describe("The workflow to change: its workflowId (slug) or _id, from get_workflows.");

const addPayloadPropertiesField = z
	.array(payloadPropertyInputSchema)
	.optional()
	.describe(
		"Payload properties to add to the workflow's payload schema, or replace in it, in the same save, as update_workflow_payload_schema's addProperties does. Payload validation is turned on while the schema has properties. Omit to leave the payload schema as it is.",
	);

function createNewStepFields() {
	return {
		__source: createWorkflowSourceInputSchema(),
		addPayloadProperties: addPayloadPropertiesField,
		step: workflowStepInputSchema.describe("The step to add."),
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

interface MutationInput {
	workflowId: string;
	__source?: string;
	addPayloadProperties?: PayloadProperty[];
}

export function registerWorkflowStepTools(server: McpServer, accessors: ToolAccessors) {
	// Static data: no Novu API call, so no credential, environmentId or idempotencyKey.
	server.registerTool(
		WORKFLOW_STEP_TOOL_NAMES.GET_STEP_SCHEMA,
		{
			annotations: { destructiveHint: false, openWorldHint: false, readOnlyHint: true },
			description:
				'Get the full JSON Schema of one step type\'s controlValues, with a valid example and, for email, how to build a Maily block body. Call it before writing an email with editorType "block", or when a step tool rejects controlValues. Read-only; calls no API.',
			inputSchema: { stepType: stepTypeSchema.describe('Step type, e.g. "email".') },
			title: "Get step schema",
		},
		async ({ stepType }) => ({
			content: [{ text: describeStepControlValues(stepType), type: "text" }],
		}),
	);

	ToolFactory.createTool(server, accessors, {
		description: `Append a step to the end of an existing workflow. Returns the saved workflow. Pass stepId to make retries safe: if a step with that stepId already exists, the workflow is returned unchanged. ${STEP_SCHEMA_HINT} ${PAYLOAD_SCHEMA_REMINDER}`,
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
		description: `Insert a step into an existing workflow immediately after the step afterStepId. Returns the saved workflow. Pass stepId to make retries safe: if a step with that stepId already exists, the workflow is returned unchanged. ${STEP_SCHEMA_HINT} ${PAYLOAD_SCHEMA_REMINDER}`,
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
		description: `Replace the content (control values) of one existing step. content.type must match the step's type; edit trigger and custom steps with update_workflow. The step's name, id and skip condition are kept and a skip in content is ignored; use update_workflow_step_conditions to change it. Any other control value you leave out is cleared, so send the step's current values along with your change; get_workflow returns a block email body as a JSON string, so send it back parsed, as an object. Returns the saved workflow. ${STEP_SCHEMA_HINT} ${PAYLOAD_SCHEMA_REMINDER}`,
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
			addPayloadProperties: addPayloadPropertiesField,
			content: workflowStepContentInputSchema.describe(
				"New control values for the step's type.",
			),
			stepId: z.string().describe("stepId of the step to edit."),
			workflowId: workflowIdField,
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description: `Set or clear the skip condition of one step (e.g. only send when the subscriber is offline). Omit skip or pass null to remove the condition. The step's content is kept. Returns the saved workflow. ${PAYLOAD_SCHEMA_REMINDER}`,
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
			addPayloadProperties: addPayloadPropertiesField,
			skip: skipConditionInputSchema,
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
			"Add, update or remove properties in the workflow's payload JSON Schema. Nothing infers it from step content, and the step and metadata tools only add the properties passed in their addPayloadProperties, so call this to declare {{payload.*}} variables that were not declared with the change that added them, to remove properties, or when the user describes the trigger payload. Property names are relative to the payload, with dot notation for nested properties (order.total for {{payload.order.total}}). Payload validation is turned on while the schema has properties. Returns the saved workflow.",
		handler: async (input, context) =>
			mutateWorkflow(context, input, (request) => ({
				message: "Updated the payload schema",
				request: editPayloadSchema(request, {
					add: input.addProperties,
					remove: input.removeProperties,
				}),
			})),
		name: WORKFLOW_STEP_TOOL_NAMES.UPDATE_PAYLOAD_SCHEMA,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			addProperties: z
				.array(payloadPropertyInputSchema)
				.optional()
				.describe("Properties to add or replace."),
			removeProperties: z
				.array(createPropertyPathSchema())
				.optional()
				.describe(
					'Property paths to remove, relative to the payload like the names in addProperties (dot notation for nested, e.g. "order.total"; a leading "payload." is ignored).',
				),
			workflowId: workflowIdField,
		}),
	});

	ToolFactory.createTool(server, accessors, {
		description:
			"Change a workflow's name, description, tags, severity or criticality, and optionally declare payload properties in the same save (addPayloadProperties). Omitted fields stay as they are; steps and preferences are kept, and the payload schema only gains the properties passed in addPayloadProperties. critical: true delivers regardless of subscriber preferences. Returns the saved workflow.",
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
					updated.preferences =
						withCriticalPreferences(request.preferences, critical) ??
						request.preferences;
				}

				return { message: "Updated workflow metadata", request: updated };
			}),
		name: WORKFLOW_STEP_TOOL_NAMES.UPDATE_METADATA,
		schema: z.object({
			__source: createWorkflowSourceInputSchema(),
			addPayloadProperties: addPayloadPropertiesField,
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

/**
 * GET, change and PUT one workflow. The input's addPayloadProperties are
 * declared in the same PUT; a mutation that leaves the workflow unchanged
 * saves nothing, those properties included.
 */
async function mutateWorkflow(
	context: ToolContext,
	input: MutationInput,
	mutate: (request: UpdateWorkflowRequest, workflow: WorkflowResponse) => Mutation,
): Promise<ApiResponse> {
	const endpoint = `/v2/workflows/${encodeURIComponent(input.workflowId)}`;
	const fetched = await ToolFactory.callApi(context, { endpoint, method: "GET" });
	if (!fetched.ok) return apiError("fetch workflow", input.workflowId, fetched);

	const workflow = fetched.data as WorkflowResponse;
	const declared = input.addPayloadProperties ?? [];
	const declaredNames = declared.map((property) => toPayloadPropertyPath(property.name));
	const outcome = mutate(toUpdateWorkflowRequest(workflow), workflow);
	if ("error" in outcome) return ToolFactory.errorResult(outcome.error);
	if ("unchanged" in outcome) {
		return workflowResult(unchangedMessage(outcome.unchanged, declaredNames), workflow);
	}

	let request = outcome.request;
	let message = outcome.message;
	if (declared.length > 0) {
		request = editPayloadSchema(request, { add: declared });
		message = `${message} and declared the payload properties ${declaredNames.join(", ")}`;
	}

	const body = input.__source ? { ...request, __source: input.__source } : request;
	const saved = await ToolFactory.callApi(
		context,
		{ body, endpoint, method: "PUT" },
		context.idempotencyKey,
	);
	if (!saved.ok) return apiError("update workflow", input.workflowId, saved);

	return workflowResult(message, saved.data);
}

/**
 * What a tool that saved nothing tells the caller: a retry of the call that
 * added the step finds it there, and that call declared the payload
 * properties in the same PUT.
 */
function unchangedMessage(unchanged: string, declaredNames: string[]): string {
	if (declaredNames.length === 0) return unchanged;

	return `${unchanged}, so nothing was saved, including the payload properties ${declaredNames.join(", ")}. If this call retries the one that added the step, that call declared them in the same save; otherwise declare them with update_workflow_payload_schema`;
}

/** Payload property paths to remove, then properties to add. */
interface PayloadSchemaEdit {
	add?: PayloadProperty[];
	remove?: string[];
}

/** Removes, then adds, payload properties; validation is on while the schema has properties. */
function editPayloadSchema(
	request: UpdateWorkflowRequest,
	{ add = [], remove = [] }: PayloadSchemaEdit,
): UpdateWorkflowRequest {
	const schema = structuredClone(request.payloadSchema ?? createEmptyPayloadSchema());
	for (const path of remove) removePayloadProperty(schema, path);
	for (const property of add) addPayloadProperty(schema, property);

	return { ...request, payloadSchema: schema, validatePayload: hasPayloadProperties(schema) };
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
