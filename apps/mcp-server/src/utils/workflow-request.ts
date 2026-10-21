/**
 * Maps a `WorkflowResponseDto` (what `GET /v2/workflows/:id` returns) to an
 * `UpdateWorkflowDto` (what `PUT /v2/workflows/:id` accepts), so step-level
 * tools can read, edit and write back a workflow without losing settings.
 *
 * - `preferences` is renamed: the response has `{ user, default }`, the
 *   request takes `{ user, workflow }`. Omitting `workflow` resets defaults.
 * - Step `providerOverrides` / `integrationOverrides` are kept: omitting them
 *   leaves them unchanged today, but sending them keeps the PUT self-contained.
 * - Response-only fields (ids, slugs, timestamps, issues, controls metadata,
 *   variables, status, payloadExample, ...) are dropped.
 */

import { toSlugIdentifier } from "./slug";

type JsonObject = Record<string, unknown>;

export interface WorkflowStepResponse {
	_id?: string;
	stepId: string;
	name: string;
	type: string;
	controlValues?: JsonObject | null;
	providerOverrides?: JsonObject | null;
	integrationOverrides?: JsonObject | null;
	stepResolverHash?: string;
	[key: string]: unknown;
}

export interface WorkflowResponse {
	_id: string;
	workflowId: string;
	slug?: string;
	name: string;
	description?: string;
	tags?: string[];
	active?: boolean;
	validatePayload?: boolean;
	payloadSchema?: JsonObject | null;
	isTranslationEnabled?: boolean;
	agent?: JsonObject | null;
	severity?: string;
	preferences?: { user?: JsonObject | null; default?: JsonObject | null };
	steps: WorkflowStepResponse[];
	[key: string]: unknown;
}

export interface WorkflowStepRequest {
	_id?: string;
	stepId?: string;
	name: string;
	type: string;
	controlValues: JsonObject;
	providerOverrides?: JsonObject | null;
	integrationOverrides?: JsonObject | null;
}

export interface UpdateWorkflowRequest {
	name: string;
	description?: string;
	tags?: string[];
	active?: boolean;
	validatePayload?: boolean;
	payloadSchema?: JsonObject | null;
	isTranslationEnabled?: boolean;
	agent?: JsonObject | null;
	severity?: string;
	preferences: { user?: JsonObject | null; workflow?: JsonObject | null };
	steps: WorkflowStepRequest[];
	__source?: string;
}

const WORKFLOW_FIELDS = [
	"description",
	"tags",
	"active",
	"validatePayload",
	"payloadSchema",
	"isTranslationEnabled",
	"agent",
	"severity",
] as const;

export function toUpdateWorkflowRequest(workflow: WorkflowResponse): UpdateWorkflowRequest {
	const request: UpdateWorkflowRequest = {
		name: workflow.name,
		preferences: {
			user: workflow.preferences?.user ?? null,
			workflow: workflow.preferences?.default ?? null,
		},
		steps: workflow.steps.map(toStepRequest),
	};

	for (const field of WORKFLOW_FIELDS) {
		if (workflow[field] !== undefined) {
			(request as unknown as JsonObject)[field] = workflow[field];
		}
	}

	return request;
}

export function toStepRequest(step: WorkflowStepResponse): WorkflowStepRequest {
	const request: WorkflowStepRequest = {
		controlValues: normalizeControlValues(step.type, step.controlValues),
		name: step.name,
		stepId: toSlugIdentifier(step.stepId),
		type: step.type,
	};

	if (step._id !== undefined) request._id = step._id;
	if (step.providerOverrides !== undefined) request.providerOverrides = step.providerOverrides;
	if (step.integrationOverrides !== undefined) {
		request.integrationOverrides = step.integrationOverrides;
	}

	return request;
}

/**
 * The API stores email bodies as strings; block-editor bodies are
 * stringified Maily JSON. Accept a parsed Maily document and stringify it.
 */
export function normalizeControlValues(
	stepType: string,
	controlValues: JsonObject | null | undefined,
): JsonObject {
	const values = { ...(controlValues ?? {}) };
	if (stepType === "email" && values.body !== undefined && typeof values.body !== "string") {
		values.body = JSON.stringify(values.body);
	}

	return values;
}
