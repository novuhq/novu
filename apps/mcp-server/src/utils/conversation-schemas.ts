import { z } from "zod";

export const listConversationsInputSchema = z.object({
	after: z.string().optional().describe("Cursor for the next page of results"),
	agentId: z
		.string()
		.optional()
		.describe(
			"Agent identifier (slug) from get_agents — not a Mongo _id. An unknown identifier returns an empty list.",
		),
	before: z.string().optional().describe("Cursor for the previous page of results"),
	createdAfter: z
		.string()
		.optional()
		.describe("Only conversations created at or after this ISO 8601 instant"),
	identifier: z
		.string()
		.optional()
		.describe(
			"Look up a conversation by public identifier (conv_*). Case-insensitive substring match.",
		),
	limit: z.number().int().min(1).max(100).optional().describe("Page size (default 10)"),
	provider: z
		.array(z.string())
		.optional()
		.describe("Channel platforms to include, e.g. slack, telegram, agent-chat"),
	status: z.enum(["active", "resolved"]).optional().describe("Filter by conversation status"),
	subscriberId: z.string().optional().describe("Filter by subscriber id"),
});

export const getConversationActivitiesInputSchema = z.object({
	after: z.string().optional().describe("Cursor for the next page of results"),
	before: z.string().optional().describe("Cursor for the previous page of results"),
	conversationId: z
		.string()
		.describe("Conversation public identifier (conv_*) from get_conversations"),
	limit: z.number().int().min(1).max(100).optional().describe("Page size (default 20)"),
	verbose: z
		.boolean()
		.optional()
		.describe("When true, return the raw JSON payload instead of the compact debug digest"),
});
