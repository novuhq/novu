import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { FindSubscribersParams } from "../types/index";
import { NovuApiUtils } from "../utils/api";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";
import { ValidationUtils } from "../utils/validation";

const createSubscriberSchema = z.object({
	avatar: z.string().optional().describe("Avatar URL or identifier"),
	data: z
		.record(z.any())
		.optional()
		.describe("Additional custom data associated with the subscriber"),
	email: z.string().optional().describe("Email address of the subscriber"),
	failIfExists: z
		.boolean()
		.optional()
		.describe(
			"If true, the request will fail if a subscriber with the same subscriberId already exists. Otherwise it will update the existing subscriber.",
		),
	firstName: z.string().optional().describe("First name of the subscriber"),
	lastName: z.string().optional().describe("Last name of the subscriber"),
	locale: z.string().optional().describe("Locale of the subscriber (e.g. 'en-US')"),
	phone: z.string().optional().describe("Phone number of the subscriber"),
	subscriberId: z
		.string()
		.describe("Unique identifier for the subscriber, typically the user ID in your system"),
	timezone: z
		.string()
		.optional()
		.describe("Timezone of the subscriber (e.g. 'America/New_York')"),
});

const findSubscribersSchema = z.object({
	email: z.string().optional().describe("Email address to search for"),
	name: z.string().optional().describe("Name to search for"),
	phone: z.string().optional().describe("Phone number to search for"),
	subscriberId: z.string().optional().describe("Subscriber ID to search for"),
});

export function registerSubscriberTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		description:
			"Create a new subscriber with attributes like name, email, phone, and custom data. If the subscriber already exists, it will be updated (unless failIfExists is true).",
		handler: async (input, context) => {
			const { failIfExists, ...body } = input;
			const queryString = failIfExists ? "?failIfExists=true" : "";
			return ToolFactory.makeApiRequest(
				context,
				{
					body,
					endpoint: `/v2/subscribers${queryString}`,
					identifier: input.subscriberId,
					method: "POST",
					successMessage: "created subscriber",
				},
				context.idempotencyKey,
			);
		},
		name: "create_subscriber",
		schema: createSubscriberSchema,
	});

	ToolFactory.createGetByIdTool(
		server,
		accessors,
		"get_subscriber",
		"Retrieve a single subscriber by their subscriberId with full profile details including channels, preferences, and custom data",
		"/v2/subscribers/{id}",
		"fetched subscriber",
		"subscriberId",
		"The subscriberId of the subscriber to retrieve",
	);

	ToolFactory.createTool(server, accessors, {
		description:
			"Update an existing subscriber's attributes like name, email, phone, avatar, locale, timezone, or custom data",
		handler: async (input, context) => {
			const { subscriberId, ...body } = input;
			return ToolFactory.makeApiRequest(
				context,
				{
					body,
					endpoint: `/v2/subscribers/${subscriberId}`,
					identifier: subscriberId,
					method: "PATCH",
					successMessage: "updated subscriber",
				},
				context.idempotencyKey,
			);
		},
		name: "update_subscriber",
		schema: z.object({
			avatar: z.string().optional().describe("Updated avatar URL"),
			data: z.record(z.any()).optional().describe("Updated custom data"),
			email: z.string().optional().describe("Updated email address"),
			firstName: z.string().optional().describe("Updated first name"),
			lastName: z.string().optional().describe("Updated last name"),
			locale: z.string().optional().describe("Updated locale (e.g. 'en-US')"),
			phone: z.string().optional().describe("Updated phone number"),
			subscriberId: z.string().describe("The subscriberId of the subscriber to update"),
			timezone: z.string().optional().describe("Updated timezone (e.g. 'America/New_York')"),
		}),
	});

	ToolFactory.createDeleteTool(
		server,
		accessors,
		"delete_subscriber",
		"Delete a subscriber by their subscriberId. This action is irreversible.",
		"/v2/subscribers/{id}",
		"deleted subscriber",
		"subscriberId",
		"The subscriberId of the subscriber to delete",
	);

	ToolFactory.createQueryGetTool(
		server,
		accessors,
		"find_subscribers",
		"Search for subscribers using various query parameters like email, name, phone number, or subscriber ID",
		"found subscribers",
		findSubscribersSchema,
		{
			buildEndpoint: (input) => {
				const params: FindSubscribersParams = {
					email: input.email,
					name: input.name,
					phone: input.phone,
					subscriberId: input.subscriberId,
				};
				const queryString = NovuApiUtils.buildQueryParams(params).toString();
				return `/v2/subscribers?${queryString}`;
			},
			formatSuccess: (data, _input, endpoint) => {
				const queryString = endpoint.split("?")[1] ?? "";
				return `Successfully found subscribers with query (${queryString}):\n\n${JSON.stringify(data, null, 2)}`;
			},
			validate: (input) =>
				ValidationUtils.validateAtLeastOneParam(input, [
					"email",
					"name",
					"phone",
					"subscriberId",
				]),
		},
	);
}
