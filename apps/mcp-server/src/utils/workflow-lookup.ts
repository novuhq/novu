import type { ApiResponse } from "../types";
import { asRecord, asString } from "./activity-format";
import { apiMessage, type ToolContext, ToolFactory } from "./tool-factory";

const OBJECT_ID = /^[a-f\d]{24}$/i;

/** A workflow as the Activity and charts routes filter by it: their `workflowIds` take its database _id. */
export type ResolvedWorkflow = { id: string; identifier?: string; name?: string };

/**
 * Resolves a trigger identifier through `GET /v2/workflows/{workflowId}`, which accepts either, and keeps only the
 * _id, identifier and name. An _id is used as is, so the history of a deleted workflow can still be read, unless
 * `lookUpIds` asks to check it exists in the environment.
 */
export async function resolveWorkflow(
	context: ToolContext,
	workflowId: string,
	{
		lookUpIds = false,
		notFoundHint = "Pass its trigger identifier (workflowId) or _id from get_workflows.",
	}: { lookUpIds?: boolean; notFoundHint?: string } = {},
): Promise<ResolvedWorkflow | { error: ApiResponse }> {
	if (!lookUpIds && OBJECT_ID.test(workflowId)) return { id: workflowId };

	const result = await ToolFactory.callApi(context, {
		endpoint: `/v2/workflows/${encodeURIComponent(workflowId)}`,
		method: "GET",
	});
	if (!result.ok) {
		if (result.status === 404) {
			return {
				error: ToolFactory.errorResult({
					message: `Error: Workflow "${workflowId}" was not found. ${notFoundHint}`,
					status: 404,
				}),
			};
		}

		return {
			error: ToolFactory.errorResult({
				message: `Error: Failed to look up workflow ${workflowId}. Status: ${result.status}, Message: ${apiMessage(result)}`,
				retryAfter: result.retryAfter,
				status: result.status,
			}),
		};
	}

	const workflow = asRecord(result.data);
	const id = asString(workflow?._id);
	if (!id) {
		return {
			error: ToolFactory.errorResult({
				message: `Error: The workflow lookup for "${workflowId}" returned no _id.`,
			}),
		};
	}

	return {
		id,
		identifier: asString(workflow?.workflowId) ?? workflowId,
		name: asString(workflow?.name),
	};
}
