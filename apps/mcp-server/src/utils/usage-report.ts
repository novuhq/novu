/**
 * The usage tool's view of `GET /v1/activity/charts`, the route behind the dashboard's Usage page. The charts hold
 * only counts, dates, workflow names and provider ids, and every field is still copied by name, so nothing else the
 * route might return later reaches the model.
 */

import { asRecord, asString } from "./activity-format";
import type { ResolvedWorkflow } from "./workflow-lookup";

type JsonRecord = Record<string, unknown>;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The Usage page's periods, counted back from now as its date filter does. The page also hides periods past
 * `MAX_DATE_ANALYTICS_ENABLED_NUMBER` (91 days in production on 2026-11-25), which this package can't read.
 */
export const USAGE_PERIODS = {
	"7d": { days: 7, label: "Last 7 days" },
	"24h": { days: 1, label: "Last 24 hours" },
	"30d": { days: 30, label: "Last 30 days" },
	"90d": { days: 90, label: "Last 90 days" },
} as const;

export type UsagePeriod = keyof typeof USAGE_PERIODS;

export const USAGE_PERIOD_KEYS = [
	"24h",
	"7d",
	"30d",
	"90d",
] as const satisfies readonly UsagePeriod[];

/**
 * The periods tried, in order, when the caller names none: the largest up to 30 days that the plan's retention
 * allows, as the page picks its default (Free keeps 24 hours, Pro 7 days).
 */
export const DEFAULT_USAGE_PERIODS = ["30d", "7d", "24h"] as const satisfies readonly UsagePeriod[];

/** The most workflows one call filters by: the Copilot drops a page filter with more values than this. */
export const MAX_USAGE_WORKFLOWS = 10;

/** The charts' report types, as `GET /v1/activity/charts` names them. */
const USAGE_REPORT_TYPES = {
	ACTIVE_SUBSCRIBERS: "active-subscribers",
	AVG_MESSAGES_PER_SUBSCRIBER: "avg-messages-per-subscriber",
	DELIVERY_TREND: "delivery-trend",
	INTERACTION_TREND: "interaction-trend",
	MESSAGES_DELIVERED: "messages-delivered",
	PROVIDER_BY_VOLUME: "provider-by-volume",
	TOTAL_INTERACTIONS: "total-interactions",
	WORKFLOW_BY_VOLUME: "workflow-by-volume",
	WORKFLOW_RUNS_TREND: "workflow-runs-trend",
} as const;

type UsageReportType = (typeof USAGE_REPORT_TYPES)[keyof typeof USAGE_REPORT_TYPES];

/**
 * The run charts the page doesn't filter by workflow yet: with the workflow run count table on, both read every
 * workflow (NV-9607). The tool leaves them out of a filtered report rather than present them as those workflows'.
 */
const UNFILTERED_BY_WORKFLOW: readonly UsageReportType[] = [
	USAGE_REPORT_TYPES.WORKFLOW_BY_VOLUME,
	USAGE_REPORT_TYPES.WORKFLOW_RUNS_TREND,
];

/** The delivery trend's channel columns, by the channel names the other tools use. */
const CHANNEL_COLUMNS = [
	["in_app", "inApp"],
	["email", "email"],
	["sms", "sms"],
	["chat", "chat"],
	["push", "push"],
] as const;

const TOP_ITEMS = 5;

/** The time range of `period` ending at `now`, as the page asks the charts for it. */
export function usageRange(period: UsagePeriod, now: Date) {
	return {
		from: new Date(now.getTime() - USAGE_PERIODS[period].days * DAY_MS).toISOString(),
		to: now.toISOString(),
	};
}

/**
 * The charts query for `period`, filtered by these workflow _ids, in the `name[]` form the dashboard sends so a
 * single value still reads as a list.
 */
export function chartsQuery(
	period: UsagePeriod,
	now: Date,
	workflowIds: readonly string[],
): string {
	const search = new URLSearchParams({ createdAtGte: usageRange(period, now).from });
	const reportTypes = Object.values(USAGE_REPORT_TYPES).filter(
		(type) => workflowIds.length === 0 || !UNFILTERED_BY_WORKFLOW.includes(type),
	);
	for (const type of reportTypes) search.append("reportType[]", type);
	for (const id of workflowIds) search.append("workflowIds[]", id);

	return search.toString();
}

/** The Usage page with this period and these workflows, as a path under `/env/<environment>`. */
export function usageDashboardPath({
	period,
	workflowIds,
}: {
	period: UsagePeriod;
	workflowIds: readonly string[];
}): string {
	const search = new URLSearchParams({ period });
	if (workflowIds.length > 0) search.append("workflows", workflowIds.join(","));

	return `/analytics?${search.toString()}`;
}

function count(value: unknown): number {
	const number = typeof value === "string" ? Number(value) : value;

	return typeof number === "number" && Number.isFinite(number) && number > 0 ? number : 0;
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

/** Percent change from `previous`; null when there is nothing to compare with. */
function changePercent(current: number, previous: number): number | null {
	return previous > 0 ? round1(((current - previous) / previous) * 100) : null;
}

function rows(value: unknown): JsonRecord[] {
	return Array.isArray(value)
		? value.map(asRecord).filter((row): row is JsonRecord => row !== undefined)
		: [];
}

function metric(value: unknown, decimals = false) {
	const record = asRecord(value);
	if (!record) return undefined;

	const current = count(record.currentPeriod);
	const previous = count(record.previousPeriod);

	return {
		changePercent: changePercent(current, previous),
		current: decimals ? round1(current) : current,
		previous: decimals ? round1(previous) : previous,
	};
}

function sumColumn(trend: JsonRecord[], column: string): number {
	return trend.reduce((sum, row) => sum + count(row[column]), 0);
}

function channelVolumes(trend: JsonRecord[]) {
	const total = CHANNEL_COLUMNS.reduce((sum, [, column]) => sum + sumColumn(trend, column), 0);

	return CHANNEL_COLUMNS.map(([channel, column]) => {
		const messages = sumColumn(trend, column);
		const busiest = trend.reduce<JsonRecord | undefined>(
			(top, row) => (count(row[column]) > count(top?.[column]) ? row : top),
			undefined,
		);

		return {
			channel,
			messages,
			share: total > 0 ? round1((messages / total) * 100) : 0,
			...(busiest && {
				busiestDay: { date: asString(busiest.timestamp), messages: count(busiest[column]) },
			}),
		};
	}).sort((a, b) => b.messages - a.messages);
}

function topBy<T>(
	items: JsonRecord[],
	toItem: (row: JsonRecord) => T | undefined,
	size: (item: T) => number,
): T[] {
	return items
		.map(toItem)
		.filter((item): item is T => item !== undefined)
		.sort((a, b) => size(b) - size(a))
		.slice(0, TOP_ITEMS);
}

export interface UsageReportInput {
	period: UsagePeriod;
	now: Date;
	/** The workflows the charts were filtered by; empty for all of them. */
	workflows: readonly ResolvedWorkflow[];
	/** The charts response's `data`, keyed by report type. */
	charts: unknown;
	/** Why the period isn't the default one, when the caller named none. */
	periodNote?: string;
}

/** The usage tool's result: the Usage page's numbers for one period, each copied by name from the charts. */
export function toUsageReport({ period, now, workflows, charts, periodNote }: UsageReportInput) {
	const data = asRecord(charts) ?? {};
	const isFiltered = workflows.length > 0;
	const interactionTrend = rows(data[USAGE_REPORT_TYPES.INTERACTION_TREND]);
	const runsTrend = rows(data[USAGE_REPORT_TYPES.WORKFLOW_RUNS_TREND]);
	const notes = [
		"messagesDelivered and channels count messages Novu handed to a provider, as the Usage page's Messages delivered does; the charts have no delivery rate or bounces.",
		"channels and messagesDelivered both count whole UTC days from the period's first day through today, from different tables, so their totals can differ slightly. Only metrics compare with the previous period; channels have no comparison.",
		"activeSubscribers, messagesPerSubscriber and workflowRuns cover every channel; inboxInteractions cover the Inbox (in-app) only.",
	];
	if (periodNote) notes.unshift(periodNote);
	if (isFiltered) {
		notes.push(
			"workflowRuns and topWorkflows are left out when filtered by workflow: the Usage page doesn't filter them by workflow yet.",
		);
	}

	return {
		period: { key: period, label: USAGE_PERIODS[period].label, ...usageRange(period, now) },
		...(isFiltered && {
			workflows: workflows.map(({ id, identifier, name }) => ({ id, identifier, name })),
		}),
		channels: channelVolumes(rows(data[USAGE_REPORT_TYPES.DELIVERY_TREND])),
		dashboardPath: usageDashboardPath({ period, workflowIds: workflows.map(({ id }) => id) }),
		inboxInteractionsByType: {
			archived: sumColumn(interactionTrend, "messageArchived"),
			read: sumColumn(interactionTrend, "messageRead"),
			seen: sumColumn(interactionTrend, "messageSeen"),
			snoozed: sumColumn(interactionTrend, "messageSnoozed"),
		},
		metrics: {
			activeSubscribers: metric(data[USAGE_REPORT_TYPES.ACTIVE_SUBSCRIBERS]),
			inboxInteractions: metric(data[USAGE_REPORT_TYPES.TOTAL_INTERACTIONS]),
			messagesDelivered: metric(data[USAGE_REPORT_TYPES.MESSAGES_DELIVERED]),
			messagesPerSubscriber: metric(
				data[USAGE_REPORT_TYPES.AVG_MESSAGES_PER_SUBSCRIBER],
				true,
			),
		},
		...(!isFiltered && {
			topWorkflows: topBy(
				rows(data[USAGE_REPORT_TYPES.WORKFLOW_BY_VOLUME]),
				(row) => {
					const name = asString(row.workflowName);

					return name ? { name, runs: count(row.count) } : undefined;
				},
				(item) => item.runs,
			),
			// The page counts finished runs only: Success and Error.
			workflowRuns: {
				error: sumColumn(runsTrend, "error"),
				success: sumColumn(runsTrend, "completed"),
				total: sumColumn(runsTrend, "completed") + sumColumn(runsTrend, "error"),
			},
		}),
		notes,
		topProviders: topBy(
			rows(data[USAGE_REPORT_TYPES.PROVIDER_BY_VOLUME]),
			(row) => {
				const providerId = asString(row.providerId);

				return providerId ? { messages: count(row.count), providerId } : undefined;
			},
			(item) => item.messages,
		),
	};
}
