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
		"Get subscriber notification preferences for all channels (email, SMS, in-app, push, chat) across all workflows and global settings",
		"/v2/subscribers/{id}/preferences",
		"fetched subscriber preferences",
		"subscriberId",
		"The subscriber ID to retrieve preferences for (obtained from find_subscribers)",
		(data, subscriberId) =>
			`Successfully fetched subscriber preferences for ${subscriberId} (includes all five channels preferences for all workflows and global preferences):\n\n${JSON.stringify(data, null, 2)}`,
	);

	ToolFactory.createTool(server, accessors, {
		description:
			"Update subscriber notification preferences for specific channels (email, SMS, in-app, push, chat) either globally or for a specific workflow",
		handler: async (input, context) => {
			const { subscriberId, channels, workflowId } = input;
			const requestBody: UpdatePreferencesRequest = {
				channels: channels as ChannelPreferences,
				...(workflowId ? { workflowId } : {}),
			};

			const scopeText = workflowId ? `for workflow ${workflowId}` : "globally";
			const channelsList = Object.entries(channels)
				.map(([channel, enabled]) => `${channel}: ${enabled}`)
				.join(", ");

			return ToolFactory.makeApiRequest(
				context,
				{
					body: requestBody,
					endpoint: `/v2/subscribers/${subscriberId}/preferences`,
					formatSuccess: (data) =>
						`Successfully updated subscriber preferences for ${subscriberId} ${scopeText}.\nUpdated channels: ${channelsList}\n\nResponse:\n${JSON.stringify(data, null, 2)}`,
					identifier: subscriberId,
					method: "PATCH",
					successMessage: `updated subscriber preferences for ${subscriberId}`,
				},
				context.idempotencyKey,
			);
		},
		name: "update_subscriber_preferences",
		schema: z.object({
			channels: z
				.object({
					chat: z.boolean().describe("Enable/disable chat notifications"),
					email: z.boolean().describe("Enable/disable email notifications"),
					in_app: z.boolean().describe("Enable/disable in-app notifications"),
					push: z.boolean().describe("Enable/disable push notifications"),
					sms: z.boolean().describe("Enable/disable SMS notifications"),
				})
				.describe("Channel preferences object with boolean values for each channel type"),
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
