import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { NovuApiUtils } from "../utils/api";
import {
	formatConversationActivitiesDigest,
	formatConversationList,
} from "../utils/conversation-digest";
import {
	getConversationActivitiesInputSchema,
	listConversationsInputSchema,
} from "../utils/conversation-schemas";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";

const LIST_CONVERSATIONS_DESCRIPTION = [
	"List agent conversations in the current environment (Cloud / self-hosted Enterprise; not Community Edition).",
	"Use after get_agents: pass that agent's identifier as agentId (slug, not Mongo _id).",
	"Then call get_conversation_activities with a conv_* identifier to debug a specific thread.",
	"To look up one known conv_* id, pass identifier (substring match).",
	"A 404 means Conversations is unavailable (Community Edition or the feature flag is off).",
].join(" ");

const GET_ACTIVITIES_DESCRIPTION = [
	"List the activity timeline for a conversation (messages, approvals, MCP connection rows).",
	"Default output is a compact debug digest with a diagnosis header for the current page.",
	"Pass verbose:true for raw JSON. Use after get_conversations.",
	"A 404 means the conversation was not found or Conversations is unavailable (Community Edition / flag off).",
].join(" ");

function formatConversationsHttpError(
	status: number,
	errorText: string,
	identifier?: string,
): string {
	if (status === 404) {
		if (identifier) {
			return `Error: Conversation "${identifier}" was not found, or Conversations is not available in this environment (Cloud / self-hosted Enterprise with the feature enabled — not Community Edition).`;
		}

		return "Error: Conversations are not available in this environment (Cloud / self-hosted Enterprise with the feature enabled — not Community Edition). Status: 404.";
	}

	if (status === 401) {
		return "Error: Not authorized to read conversations. API keys and OAuth tokens need the Conversations read routes enabled on the API (Cloud / Enterprise).";
	}

	return identifier
		? `Error: Failed to fetch conversations for ${identifier}. Status: ${status}, Message: ${errorText}`
		: `Error: Failed to fetch conversations. Status: ${status}, Message: ${errorText}`;
}

export function registerConversationTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createQueryGetTool(
		server,
		accessors,
		"get_conversations",
		LIST_CONVERSATIONS_DESCRIPTION,
		"fetched conversations",
		listConversationsInputSchema,
		{
			buildEndpoint: (input) => {
				const query = NovuApiUtils.buildQueryParams({
					after: input.after,
					agentId: input.agentId,
					before: input.before,
					createdAfter: input.createdAfter,
					identifier: input.identifier,
					limit: input.limit,
					provider: input.provider,
					status: input.status,
					subscriberId: input.subscriberId,
				}).toString();

				return query ? `/v1/conversations?${query}` : "/v1/conversations";
			},
			formatError: formatConversationsHttpError,
			formatSuccess: (data, input) =>
				formatConversationList(data, { agentId: input.agentId }),
		},
	);

	ToolFactory.createQueryGetTool(
		server,
		accessors,
		"get_conversation_activities",
		GET_ACTIVITIES_DESCRIPTION,
		"fetched conversation activities",
		getConversationActivitiesInputSchema,
		{
			buildEndpoint: (input) => {
				const query = NovuApiUtils.buildQueryParams({
					after: input.after,
					before: input.before,
					limit: input.limit,
				}).toString();
				const path = `/v1/conversations/${encodeURIComponent(input.conversationId)}/activities`;

				return query ? `${path}?${query}` : path;
			},
			formatError: formatConversationsHttpError,
			formatSuccess: (data, input) =>
				formatConversationActivitiesDigest(data, {
					conversationId: input.conversationId,
					verbose: input.verbose,
				}),
			getIdentifier: (input) => input.conversationId,
		},
	);
}
