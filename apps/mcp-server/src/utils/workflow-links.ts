/**
 * Dashboard links for the workflow tools: a `dashboardPath` on each workflow and on the list, built from the slug the
 * API returned, so a model links to the workflow without writing a path itself. A path goes after `/env/<environment>`.
 */

import { asRecord } from "./activity-format";

/** The workflows list. */
export const WORKFLOWS_DASHBOARD_PATH = "/workflows";

/** A workflow's editor; it takes the slug the API returns (`<workflowId>_wf_<_id>`). */
export function workflowDashboardPath(slug: string): string {
	return `${WORKFLOWS_DASHBOARD_PATH}/${encodeURIComponent(slug)}`;
}

/** `GET /v2/workflows/:id`'s response, in its `{ data }` envelope or not, with the workflow's `dashboardPath`. */
export function withWorkflowLink(value: unknown): unknown {
	const envelope = asRecord(value);
	if (envelope && "data" in envelope && !("slug" in envelope)) {
		return { ...envelope, data: linkWorkflow(envelope.data) };
	}

	return linkWorkflow(value);
}

/** `GET /v2/workflows`'s response, in its `{ data }` envelope or not, with the list's and each workflow's `dashboardPath`. */
export function withWorkflowListLinks(value: unknown): unknown {
	const envelope = asRecord(value);
	const list = asRecord(envelope && "data" in envelope ? envelope.data : value);
	if (!list || !Array.isArray(list.workflows)) return value;

	const linked = {
		...list,
		dashboardPath: WORKFLOWS_DASHBOARD_PATH,
		workflows: list.workflows.map(linkWorkflow),
	};

	return envelope && "data" in envelope ? { ...envelope, data: linked } : linked;
}

/** A v1 workflow opens in the legacy dashboard, which this path doesn't reach, so it gets no link. */
const LEGACY_WORKFLOW_ORIGIN = "novu-cloud-v1";

function linkWorkflow(value: unknown): unknown {
	const workflow = asRecord(value);
	if (
		!workflow ||
		typeof workflow.slug !== "string" ||
		workflow.origin === LEGACY_WORKFLOW_ORIGIN
	) {
		return value;
	}

	return { ...workflow, dashboardPath: workflowDashboardPath(workflow.slug) };
}
