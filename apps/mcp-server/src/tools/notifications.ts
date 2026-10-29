import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { GetNotificationsParams } from "../types/index";
import { NovuApiUtils } from "../utils/api";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";
import { ValidationUtils } from "../utils/validation";

const getNotificationsSchema = z.object({
	after: z.string().optional().describe("Date filter for records after this timestamp"),
	before: z.string().optional().describe("Date filter for records before this timestamp"),
	channels: z
		.array(z.string())
		.optional()
		.describe("Array of channel types (e.g., ['in_app', 'email'])"),
	emails: z
		.array(z.string())
		.optional()
		.describe("Array of email addresses or a single email address"),
	limit: z
		.number()
		.min(1)
		.max(50)
		.optional()
		.describe("Limit for pagination (default: 10, max: 50)"),
	page: z.number().min(0).optional().describe("Page number for pagination (default: 0)"),
	subscriberIds: z
		.array(z.string())
		.optional()
		.describe("Array of subscriber IDs or a single subscriber ID"),
	templates: z
		.array(z.string())
		.optional()
		.describe(
			"Array of template IDs or a single template ID, templateId is workflowId from get_workflows",
		),
	topicKey: z.string().optional().describe("Topic Key for filtering notifications by topic"),
	transactionId: z.string().optional().describe("Transaction ID for filtering"),
});

function formatNotificationFilters(input: z.infer<typeof getNotificationsSchema>): string[] {
	const filterSummary: string[] = [];
	if (input.channels) filterSummary.push(`channels: ${input.channels.join(", ")}`);
	if (input.templates) filterSummary.push(`templates: ${input.templates.join(", ")}`);
	if (input.emails) filterSummary.push(`emails: ${input.emails.join(", ")}`);
	if (input.subscriberIds) filterSummary.push(`subscriberIds: ${input.subscriberIds.join(", ")}`);
	if (input.page !== undefined) filterSummary.push(`page: ${input.page}`);
	if (input.limit !== undefined) filterSummary.push(`limit: ${input.limit}`);
	if (input.transactionId) filterSummary.push(`transactionId: ${input.transactionId}`);
	if (input.topicKey) filterSummary.push(`topicKey: ${input.topicKey}`);
	if (input.after) filterSummary.push(`after: ${input.after}`);
	if (input.before) filterSummary.push(`before: ${input.before}`);
	return filterSummary;
}

export function registerNotificationTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createQueryGetTool(
		server,
		accessors,
		"get_notifications",
		"Get notifications/events from Novu with advanced filtering options by channels, templates, emails, subscribers, dates, and more",
		"fetched notifications",
		getNotificationsSchema,
		{
			buildEndpoint: (input) => {
				const params: GetNotificationsParams = {
					after: input.after,
					before: input.before,
					channels: input.channels,
					emails: input.emails,
					limit: input.limit,
					page: input.page,
					subscriberIds: input.subscriberIds,
					templates: input.templates,
					topicKey: input.topicKey,
					transactionId: input.transactionId,
				};
				const queryString = NovuApiUtils.buildQueryParams(params).toString();
				return `/v1/notifications${queryString ? `?${queryString}` : ""}`;
			},
			formatSuccess: (data, input) => {
				const filterSummary = formatNotificationFilters(input);
				const filterText =
					filterSummary.length > 0 ? ` with filters (${filterSummary.join(", ")})` : "";
				return `Successfully fetched notifications${filterText}:\n\n${JSON.stringify(data, null, 2)}`;
			},
			validate: (input) => ValidationUtils.validatePagination(input.page, input.limit),
		},
	);

	ToolFactory.createGetByIdTool(
		server,
		accessors,
		"get_notification",
		"Get a specific notification by ID with detailed execution logs, status, and delivery information",
		"/v1/notifications/{id}",
		"fetched notification",
		"notificationId",
		"The notification ID (MongoDB ID) to retrieve (obtained from get_notifications)",
		(data, id) =>
			`Successfully fetched notification ${id} with execution logs and status:\n\n${JSON.stringify(data, null, 2)}`,
	);
}
