import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types";
import type { ToolAccessors } from "../utils/tool-accessors";
import { apiMessage, type FailedApiCall, ToolFactory } from "../utils/tool-factory";
import {
	chartsQuery,
	DEFAULT_USAGE_PERIODS,
	MAX_USAGE_WORKFLOWS,
	toUsageReport,
	USAGE_PERIOD_KEYS,
	USAGE_PERIODS,
	type UsagePeriod,
} from "../utils/usage-report";
import { type ResolvedWorkflow, resolveWorkflow } from "../utils/workflow-lookup";
import { USAGE_TOOL_NAMES } from "./tool-names";

/*
 * The Copilot's Usage page tools. The hosted server doesn't list them yet: `GET /v1/activity/charts` refuses API keys
 * and OAuth (NV-9608).
 */

const [GET_USAGE] = USAGE_TOOL_NAMES;

const READ_ONLY = { destructiveHint: false, openWorldHint: false, readOnlyHint: true } as const;

const getUsageSchema = z.object({
	period: z
		.enum(USAGE_PERIOD_KEYS)
		.optional()
		.describe(
			`The Usage page's period, counted back from now: ${USAGE_PERIOD_KEYS.join(", ")}. Default: the largest up to 30d that the plan keeps`,
		),
	workflowIds: z
		.array(z.string())
		.max(MAX_USAGE_WORKFLOWS, {
			error: `Pass at most ${MAX_USAGE_WORKFLOWS} workflowIds, or leave it out for all workflows`,
		})
		.optional()
		.describe(
			`Only these workflows, at most ${MAX_USAGE_WORKFLOWS}: trigger identifiers (e.g. password-reset) or database _ids. Omit for all workflows`,
		),
});

function usageError(period: UsagePeriod, result: FailedApiCall): ApiResponse {
	const message =
		result.status === 402
			? `Error: ${USAGE_PERIODS[period].label} is outside your plan's activity retention period. ${apiMessage(result)} Ask for a shorter period.`
			: `Error: Failed to read usage. Status: ${result.status}, Message: ${apiMessage(result)}`;

	return ToolFactory.errorResult({
		message,
		retryAfter: result.retryAfter,
		status: result.status,
	});
}

export function registerUsageTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		annotations: READ_ONLY,
		description:
			"Read notification usage as the dashboard's Usage page charts show it, for one of its periods and optionally some workflows: messages delivered, active subscribers, messages per subscriber and Inbox interactions, each against the previous period; messages per channel; workflow runs; the top workflows and providers. Counts only: no subscriber data.",
		handler: async (input, context) => {
			const requested = [
				...new Set((input.workflowIds ?? []).map((id) => id.trim()).filter(Boolean)),
			];
			// An _id is looked up too: an unknown one would filter every chart to zero and read as no traffic.
			const lookups = await Promise.all(
				requested.map((workflowId) =>
					resolveWorkflow(context, workflowId, {
						lookUpIds: true,
						notFoundHint:
							"Pass its trigger identifier or _id; workflows picked in the Usage page's Workflows filter arrive in the page's filters.",
					}),
				),
			);
			const workflows = new Map<string, ResolvedWorkflow>();
			for (const lookup of lookups) {
				if ("error" in lookup) return lookup.error;
				workflows.set(lookup.id, lookup);
			}
			const workflowIds = [...workflows.keys()];

			const now = new Date();
			const periods: readonly UsagePeriod[] = input.period
				? [input.period]
				: DEFAULT_USAGE_PERIODS;
			for (const [index, period] of periods.entries()) {
				const result = await ToolFactory.callApi(context, {
					endpoint: `/v1/activity/charts?${chartsQuery(period, now, workflowIds)}`,
					method: "GET",
				});
				// Without a period asked for, step down to what the plan keeps, as the page's default does.
				if (!result.ok && result.status === 402 && index < periods.length - 1) continue;
				if (!result.ok) return usageError(period, result);

				const report = toUsageReport({
					charts: result.data,
					now,
					period,
					periodNote:
						index > 0
							? `No period was asked for, and longer ones are outside the plan's activity retention period, so this is the ${USAGE_PERIODS[period].label.toLowerCase()}.`
							: undefined,
					workflows: [...workflows.values()],
				});

				return { content: [{ text: JSON.stringify(report), type: "text" }] };
			}

			return ToolFactory.errorResult({ message: "Error: No period to read usage for." });
		},
		name: GET_USAGE,
		schema: getUsageSchema,
		title: "Get usage",
	});
}
