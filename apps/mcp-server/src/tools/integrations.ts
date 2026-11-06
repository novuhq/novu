import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";

export function registerIntegrationTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createGetTool(
		server,
		accessors,
		"get_integrations",
		"List all channel integrations (email, SMS, push, chat, in-app) configured in your Novu organization. To create a new integration, visit the Integrations tab at https://dashboard.novu.co/integrations",
		"/v1/integrations",
		"fetched integrations",
	);

	ToolFactory.createGetTool(
		server,
		accessors,
		"get_active_integrations",
		"List only the active integrations in your Novu organization",
		"/v1/integrations/active",
		"fetched active integrations",
	);

	ToolFactory.createDeleteTool(
		server,
		accessors,
		"delete_integration",
		"Delete an integration by its integrationId. This action is irreversible.",
		"/v1/integrations/{id}",
		"deleted integration",
		"integrationId",
		"The ID of the integration to delete",
	);

	ToolFactory.createTool(server, accessors, {
		description:
			"Mark an integration as the primary integration for its channel. The primary integration is used as the default for sending notifications on that channel.",
		handler: async (input, context) => {
			return ToolFactory.makeApiRequest(
				context,
				{
					endpoint: `/v1/integrations/${input.integrationId}/set-primary`,
					identifier: input.integrationId,
					method: "POST",
					successMessage: "set integration as primary",
				},
				context.idempotencyKey,
			);
		},
		name: "set_primary_integration",
		schema: z.object({
			integrationId: z.string().describe("The ID of the integration to set as primary"),
		}),
	});
}
