import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ChannelPreferences, UpdatePreferencesRequest } from "../types/index";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";

export function registerPreferenceTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createGetByIdTool(
		server,
		accessors,
		"get_subscriber_preferences",
		"Get subscriber notification preferences for every channel (email, SMS, in-app, push, chat, tool) across all workflows and global settings",
		"/v2/subscribers/{id}/preferences",
		"fetched subscriber preferences",
		"subscriberId",
		"The subscriber ID to retrieve preferences for (obtained from find_subscribers)",
		(data, subscriberId) =>
			`Successfully fetched subscriber preferences for ${subscriberId} (channel preferences for all workflows and global preferences):\n\n${JSON.stringify(data, null, 2)}`,
	);

	ToolFactory.createTool(server, accessors, {
		description:
			"Update subscriber notification preferences for specific channels (email, SMS, in-app, push, chat, tool) either globally or for a specific workflow. Send only the channels to change; the others keep their current value.",
		handler: async (input, context) => {
			const { subscriberId, channels, workflowId } = input;
			const changed = Object.entries(channels).filter(([, enabled]) => enabled !== undefined);
			if (changed.length === 0) {
				return ToolFactory.errorResult({
					message:
						'Error: channels needs at least one channel to change, e.g. { "sms": false }. Channels you leave out keep their current value.',
					status: 400,
				});
			}

			const requestBody: UpdatePreferencesRequest = {
				channels: Object.fromEntries(changed) as ChannelPreferences,
				...(workflowId ? { workflowId } : {}),
			};

			const scopeText = workflowId ? `for workflow ${workflowId}` : "globally";
			const channelsList = changed
				.map(([channel, enabled]) => `${channel}: ${enabled}`)
				.join(", ");

			return ToolFactory.makeApiRequest(
				context,
				{
					body: requestBody,
					endpoint: `/v2/subscribers/${encodeURIComponent(subscriberId)}/preferences`,
					formatSuccess: (data) =>
						`Successfully updated subscriber preferences for ${subscriberId} ${scopeText}.\nUpdated channels: ${channelsList}\n\nResponse:\n${JSON.stringify(data, null, 2)}`,
					identifier: subscriberId,
					method: "PATCH",
					// `identifier` appends the subscriberId to the log and error text.
					successMessage: "updated subscriber preferences for",
				},
				context.idempotencyKey,
			);
		},
		name: "update_subscriber_preferences",
		schema: z.object({
			channels: z
				.object({
					chat: z.boolean().optional().describe("Enable/disable chat notifications"),
					email: z.boolean().optional().describe("Enable/disable email notifications"),
					in_app: z.boolean().optional().describe("Enable/disable in-app notifications"),
					push: z.boolean().optional().describe("Enable/disable push notifications"),
					sms: z.boolean().optional().describe("Enable/disable SMS notifications"),
					tool: z.boolean().optional().describe("Enable/disable tool notifications"),
				})
				.describe("Channels to change, e.g. { sms: false }; at least one"),
			subscriberId: z
				.string()
				.describe(
					"The subscriber ID to update preferences for (obtained from find_subscribers)",
				),
			workflowId: z
				.string()
				.optional()
				.describe(
					"Optional workflow ID - if provided, updates that workflow preference; otherwise updates global preferences",
				),
		}),
	});
}
