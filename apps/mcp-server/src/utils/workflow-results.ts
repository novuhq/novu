import type { ApiResponse } from "../types";
import { type ApiCallResult, ToolFactory } from "./tool-factory";
import { redactWorkflowSecrets } from "./workflow-secrets";

/**
 * Successful write: the saved workflow as text and as `structuredContent.workflow`, with each HTTP request step's
 * secrets hidden as get_workflow hides them. A caller that sends the placeholders back keeps the stored values.
 */
export function workflowResult(message: string, workflow: unknown): ApiResponse {
	const shown = redactWorkflowSecrets(workflow);

	return {
		content: [{ text: `${message}:\n\n${JSON.stringify(shown, null, 2)}`, type: "text" }],
		structuredContent: { workflow: shown },
	};
}

/** Failed API call: keeps the HTTP status and `Retry-After` in `structuredContent.error`. */
export function apiError(
	operation: string,
	identifier: string,
	result: Extract<ApiCallResult, { ok: false }>,
): ApiResponse {
	return ToolFactory.errorResult({
		message: `Error: Failed to ${operation} ${identifier}. Status: ${result.status}, Message: ${result.errorText}`,
		retryAfter: result.retryAfter,
		status: result.status,
	});
}

/** Copies the defined entries of `values` onto `target`. */
export function assignOptional(
	target: Record<string, unknown>,
	values: Record<string, unknown>,
): void {
	for (const [key, value] of Object.entries(values)) {
		if (value !== undefined) target[key] = value;
	}
}
