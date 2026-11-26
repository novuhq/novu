import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types";
import {
	asRecord,
	asString,
	hasTransactionId,
	listRows,
	matchTriggerRequest,
	TRIGGER_URL_PATTERNS,
	toRunDetail,
	toRunSummary,
	toTriggerRequestDetail,
	toTriggerRequestSummary,
	triggerRequestsDashboardPath,
	workflowRunsDashboardPath,
} from "../utils/activity-format";
import { NovuApiUtils } from "../utils/api";
import type { ToolAccessors } from "../utils/tool-accessors";
import {
	apiMessage,
	type FailedApiCall,
	type ToolContext,
	ToolFactory,
} from "../utils/tool-factory";
import { resolveWorkflow } from "../utils/workflow-lookup";
import { ACTIVITY_TOOL_NAMES } from "./tool-names";

const [GET_WORKFLOW_RUNS, GET_WORKFLOW_RUN, GET_TRIGGER_REQUESTS] = ACTIVITY_TOOL_NAMES;

const READ_ONLY = { destructiveHint: false, openWorldHint: false, readOnlyHint: true } as const;

const DEFAULT_RUNS_LIMIT = 10;
const DEFAULT_REQUESTS_LIMIT = 20;
const RUN_REQUESTS_LIMIT = 5;
// The API matches transactionId as a substring, so fetch more and keep the exact matches.
const RUN_REQUESTS_SCAN = 50;
const REQUESTS_PAGE_SIZE = 100;
const REQUESTS_SCAN_CAP = 500;

const isoDate = (description: string) =>
	z
		.string()
		.refine((value) => !Number.isNaN(Date.parse(value)), {
			error: 'Expected an ISO 8601 date such as "2026-11-01" or "2026-11-01T09:30:00Z"',
		})
		.optional()
		.describe(description);

const getWorkflowRunsSchema = z.object({
	channels: z
		.array(z.enum(["in_app", "email", "sms", "chat", "push", "tool"]))
		.optional()
		.describe("Only runs with a step on one of these channels"),
	contextKeys: z
		.array(z.string())
		.optional()
		.describe(
			'Only runs with all of these contexts, as type:id (e.g. tenant:acme); [""] for runs without a context',
		),
	createdAfter: isoDate("Only runs created at or after this ISO 8601 date"),
	createdBefore: isoDate("Only runs created at or before this ISO 8601 date"),
	cursor: z.string().optional().describe("next from the previous call, for the next page"),
	limit: z.number().int().min(1).max(50).optional().describe("Runs to return (default 10)"),
	severity: z
		.array(z.enum(["high", "medium", "low", "none"]))
		.optional()
		.describe("Only runs of workflows with one of these severities"),
	statuses: z
		.array(z.enum(["processing", "completed", "error"]))
		.optional()
		.describe(
			"Only runs with one of these statuses. A run with a failed step can stay processing, so to find failed runs omit this and check step statuses",
		),
	subscriberId: z.string().optional().describe("Only runs for this subscriberId"),
	subscriptionId: z
		.string()
		.optional()
		.describe("Only runs delivered through this topic subscription identifier"),
	topicKey: z.string().optional().describe("Only runs triggered to this topic key"),
	transactionId: z.string().optional().describe("Only runs of this trigger transactionId"),
	workflowId: z
		.string()
		.optional()
		.describe("Workflow trigger identifier (e.g. password-reset) or database _id"),
});

const getWorkflowRunSchema = z.object({
	workflowRunId: z.string().describe("Run id from get_workflow_runs"),
});

const getTriggerRequestsSchema = z.object({
	createdAfter: isoDate("Only requests made at or after this ISO 8601 date"),
	limit: z
		.number()
		.int()
		.min(1)
		.max(50)
		.optional()
		.describe("Matching requests to return (default 20)"),
	requestId: z
		.string()
		.optional()
		.describe("One request by id (req_…), with its traces; the other filters are ignored"),
	statusCodes: z
		.array(z.number().int().min(100).max(599))
		.optional()
		.describe("Only these HTTP response codes, e.g. [400, 422]"),
	subscriberId: z
		.string()
		.optional()
		.describe("Matched against the body's to; broadcasts have no to and never match"),
	transactionId: z.string().optional().describe("Requests whose transactionId contains this"),
	urlPattern: z
		.enum(TRIGGER_URL_PATTERNS)
		.optional()
		.describe("One trigger route; all three when omitted"),
	workflowId: z
		.string()
		.optional()
		.describe("Workflow trigger identifier, matched against the body's name"),
});

/** Any non-2xx is an error result; a 402 says how to stay inside the plan's retention window. */
function activityError(operation: string, result: FailedApiCall): ApiResponse {
	const message =
		result.status === 402
			? `Error: The requested date range is outside your plan's activity retention period. ${apiMessage(result)} Send a later createdAfter, or omit createdAfter and createdBefore to search the whole retention window.`
			: `Error: Failed to ${operation}. Status: ${result.status}, Message: ${apiMessage(result)}`;

	return ToolFactory.errorResult({
		message,
		retryAfter: result.retryAfter,
		status: result.status,
	});
}

function json(value: unknown): ApiResponse {
	return { content: [{ text: JSON.stringify(value), type: "text" }] };
}

function emptyRunsNote(input: z.infer<typeof getWorkflowRunsSchema>): string {
	const window =
		input.createdAfter || input.createdBefore
			? `between ${input.createdAfter ?? "the start of your plan's retention window"} and ${input.createdBefore ?? "now"}`
			: "within your plan's activity retention window";

	return `No workflow runs matched these filters ${window}. If the trigger may have been rejected, check ${GET_TRIGGER_REQUESTS}.`;
}

async function triggerRequestsForRun(context: ToolContext, transactionId: string | undefined) {
	if (!transactionId) return {};

	const query = NovuApiUtils.buildQueryParams({ limit: RUN_REQUESTS_SCAN, transactionId });
	try {
		const result = await ToolFactory.callApi(context, {
			endpoint: `/v1/activity/requests?${query}`,
			method: "GET",
			unwrapData: false,
		});
		if (!result.ok) {
			return {
				triggerRequestsError: `Could not look up the trigger request (status ${result.status}): ${apiMessage(result)}`,
			};
		}

		return {
			triggerRequests: listRows(result.data)
				.filter((row) => hasTransactionId(row, transactionId))
				.slice(0, RUN_REQUESTS_LIMIT)
				.map((row) => {
					const { createdAt, dashboardPath, id, statusCode, urlPattern } =
						toTriggerRequestSummary(row);

					return { createdAt, dashboardPath, id, statusCode, urlPattern };
				}),
		};
	} catch (error) {
		return {
			triggerRequestsError: `Could not look up the trigger request: ${error instanceof Error ? error.message : "Unknown error"}`,
		};
	}
}

async function getTriggerRequest(context: ToolContext, requestId: string): Promise<ApiResponse> {
	const result = await ToolFactory.callApi(context, {
		endpoint: `/v1/activity/requests/${encodeURIComponent(requestId)}`,
		method: "GET",
	});
	if (!result.ok) return activityError(`get request ${requestId}`, result);

	return json(toTriggerRequestDetail(result.data));
}

export function registerActivityTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		annotations: READ_ONLY,
		description: `List workflow runs (one per subscriber per trigger), newest first, with each step's status. Use it to find why a subscriber did or did not get a notification, then call ${GET_WORKFLOW_RUN} for errors. Searches the plan's activity retention window unless createdAfter or createdBefore narrow it.`,
		handler: async (input, context) => {
			const workflow = input.workflowId
				? await resolveWorkflow(context, input.workflowId)
				: undefined;
			if (workflow && "error" in workflow) return workflow.error;

			const query = NovuApiUtils.buildQueryParams({
				channels: input.channels,
				contextKeys: input.contextKeys,
				createdGte: input.createdAfter,
				createdLte: input.createdBefore,
				cursor: input.cursor,
				limit: input.limit ?? DEFAULT_RUNS_LIMIT,
				severity: input.severity,
				statuses: input.statuses,
				subscriberIds: input.subscriberId,
				subscriptionId: input.subscriptionId,
				topicKey: input.topicKey,
				transactionIds: input.transactionId,
				workflowIds: workflow?.id,
			});
			const result = await ToolFactory.callApi(context, {
				endpoint: `/v1/activity/workflow-runs?${query}`,
				method: "GET",
				unwrapData: false,
			});
			if (!result.ok) return activityError("list workflow runs", result);

			const runs = listRows(result.data).map(toRunSummary);

			return json({
				dashboardPath: workflowRunsDashboardPath({ ...input, workflowId: workflow?.id }),
				filters: {
					channels: input.channels,
					contextKeys: input.contextKeys,
					createdAfter: input.createdAfter,
					createdBefore: input.createdBefore,
					severity: input.severity,
					statuses: input.statuses,
					subscriberId: input.subscriberId,
					subscriptionId: input.subscriptionId,
					topicKey: input.topicKey,
					transactionId: input.transactionId,
					workflowId: workflow?.id,
					workflowIdentifier: workflow?.identifier,
				},
				next: asString(asRecord(result.data)?.next) ?? null,
				note: runs.length === 0 ? emptyRunsNote(input) : undefined,
				runs,
			});
		},
		name: GET_WORKFLOW_RUNS,
		schema: getWorkflowRunsSchema,
		title: "Get workflow runs",
	});

	ToolFactory.createTool(server, accessors, {
		annotations: READ_ONLY,
		description: `Get one workflow run: each step's status, error code and message, and the execution details that explain the outcome (provider responses trimmed to status and error fields), plus the trigger request for its transactionId. Use a run id from ${GET_WORKFLOW_RUNS}.`,
		handler: async (input, context) => {
			const result = await ToolFactory.callApi(context, {
				endpoint: `/v1/activity/workflow-runs/${encodeURIComponent(input.workflowRunId)}`,
				method: "GET",
			});
			if (!result.ok) {
				return activityError(`get workflow run ${input.workflowRunId}`, result);
			}

			const run = asRecord(result.data) ?? {};
			const detail = toRunDetail(run);

			return json({
				...detail,
				...(await triggerRequestsForRun(context, detail.run.transactionId)),
			});
		},
		name: GET_WORKFLOW_RUN,
		schema: getWorkflowRunSchema,
		title: "Get workflow run",
	});

	ToolFactory.createTool(server, accessors, {
		annotations: READ_ONLY,
		description: `List trigger API requests (events/trigger, bulk and broadcast), newest first, with status code, workflow and error, without bodies. Use it when ${GET_WORKFLOW_RUNS} finds no run, to see whether the trigger arrived or was rejected. workflowId and subscriberId are matched in request bodies, scanning at most 500 requests.`,
		handler: async (input, context) => {
			if (input.requestId) return getTriggerRequest(context, input.requestId);

			const limit = input.limit ?? DEFAULT_REQUESTS_LIMIT;
			const matchBody = Boolean(input.workflowId || input.subscriberId);
			const pageSize = matchBody ? REQUESTS_PAGE_SIZE : limit;
			const createdGte = input.createdAfter ? Date.parse(input.createdAfter) : undefined;
			const matches: Record<string, unknown>[] = [];
			let scanned = 0;
			let unchecked = 0;
			let total: number | undefined;
			let exhausted = false;

			for (let page = 0; matches.length < limit && scanned < REQUESTS_SCAN_CAP; page++) {
				const query = NovuApiUtils.buildQueryParams({
					createdGte,
					limit: pageSize,
					page,
					// Request logs come from the trigger routes and inbound mail; `http` keeps the trigger routes.
					source: input.urlPattern ? undefined : "http",
					statusCodes: input.statusCodes,
					transactionId: input.transactionId,
					urlPattern: input.urlPattern,
				});
				const result = await ToolFactory.callApi(context, {
					endpoint: `/v1/activity/requests?${query}`,
					method: "GET",
					unwrapData: false,
				});
				if (!result.ok) return activityError("list trigger requests", result);

				const rows = listRows(result.data);
				const reportedTotal = asRecord(result.data)?.total;
				if (typeof reportedTotal === "number") total = reportedTotal;
				scanned += rows.length;
				for (const row of rows) {
					if (matches.length >= limit) break;
					const isTriggerRoute = (TRIGGER_URL_PATTERNS as readonly unknown[]).includes(
						row.urlPattern,
					);
					if (!isTriggerRoute) continue;
					const match = matchTriggerRequest(row, input);
					if (match === "match") matches.push(row);
					if (match === "unchecked") unchecked++;
				}
				if (rows.length < pageSize) {
					exhausted = true;
					break;
				}
			}

			const scanLimitReached =
				!exhausted &&
				matches.length < limit &&
				scanned >= REQUESTS_SCAN_CAP &&
				(total === undefined || total > scanned);
			const requests = matches.map(toTriggerRequestSummary);

			return json({
				dashboardPath: triggerRequestsDashboardPath(input),
				filters: {
					createdAfter: input.createdAfter,
					statusCodes: input.statusCodes,
					subscriberId: input.subscriberId,
					transactionId: input.transactionId,
					urlPattern: input.urlPattern ?? TRIGGER_URL_PATTERNS,
					workflowId: input.workflowId,
				},
				note:
					[
						requests.length > 0
							? undefined
							: scanLimitReached
								? `No trigger requests matched among the ${scanned} most recent scanned. Narrow createdAfter, statusCodes or transactionId to search further back.`
								: "No trigger requests matched these filters.",
						unchecked > 0
							? `${unchecked} request bodies were too large to store whole, so they could not be checked for this workflow or subscriber.`
							: undefined,
					]
						.filter(Boolean)
						.join(" ") || undefined,
				requests,
				scanLimitReached,
				scanned,
				total,
				truncatedBodiesNotChecked: unchecked > 0 ? unchecked : undefined,
			});
		},
		name: GET_TRIGGER_REQUESTS,
		schema: getTriggerRequestsSchema,
		title: "Get trigger requests",
	});
}
