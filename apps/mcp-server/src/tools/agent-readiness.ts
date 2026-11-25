import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { ApiResponse } from "../types/index";
import { buildAgentReadiness } from "../utils/agent-readiness";
import { agentResourcePath } from "../utils/agent-schemas";
import type { ToolAccessors } from "../utils/tool-accessors";
import { type ApiCallResult, type ToolContext, ToolFactory } from "../utils/tool-factory";
import { AGENT_READINESS_TOOL_NAMES } from "./tool-names";

const [AGENT_READINESS_TOOL_NAME] = AGENT_READINESS_TOOL_NAMES;

const READ_ONLY = { destructiveHint: false, openWorldHint: false, readOnlyHint: true } as const;

/** The dashboard reads an agent's channels in one page of this size. */
const LINKS_READ_LIMIT = 100;

type FailedCall = Extract<ApiCallResult, { ok: false }>;

const agentReadinessSchema = z.object({
	identifier: z.string().min(1).describe("Agent identifier (slug) from get_agents"),
});

/**
 * `get_agent_readiness`: whether one agent can reply on each of its channels, and why not. Built
 * from the agent and its channel links; neither read returns a credential,
 * and the bridge URLs lose their user info and query string before the rules run.
 */
export function registerAgentReadinessTool(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		annotations: READ_ONLY,
		description:
			"Check whether one agent can reply on each channel connected to it, and why not: the agent is inactive, past a plan limit, has no bridge URL, the channel has received no message yet, or the email inbox is off. Also returns the bridge (managed, local or URL). Covers setup, not message history: use get_conversations for that. Never returns credentials, tokens or setup links.",
		handler: async ({ identifier }, context) => {
			const [agent, links] = await Promise.all([
				read(context, agentResourcePath(identifier)),
				read(
					context,
					`${agentResourcePath(identifier)}/integrations?${new URLSearchParams({ limit: String(LINKS_READ_LIMIT) })}`,
					{ unwrapData: false },
				),
			]);

			if (!agent.ok) {
				return agentError(identifier, agent);
			}

			const linkRows = links.ok ? rows(links.data) : undefined;
			const result = buildAgentReadiness({
				agent: agent.data,
				links: linkRows ?? {
					error: links.ok
						? "couldn't check channels: unexpected response"
						: couldNotCheck("channels", links),
				},
			});
			if (!result) {
				return ToolFactory.errorResult({
					message: `Error: The API returned no agent for "${identifier}".`,
				});
			}

			return {
				content: [{ text: JSON.stringify(result), type: "text" as const }],
				structuredContent: { readiness: result },
			};
		},
		name: AGENT_READINESS_TOOL_NAME,
		schema: agentReadinessSchema,
		title: "Get agent readiness",
	});
}

/** One GET that never throws: a network error comes back as a failed call with status 0. */
async function read(
	context: ToolContext,
	endpoint: string,
	options: { unwrapData?: boolean } = {},
): Promise<ApiCallResult> {
	try {
		return await ToolFactory.callApi(context, { endpoint, method: "GET", ...options });
	} catch (error) {
		return {
			errorText: error instanceof Error ? error.message : "Request failed",
			ok: false,
			status: 0,
		};
	}
}

/** A paginated list's rows, or `undefined` for a response without them. */
function rows(payload: unknown): unknown[] | undefined {
	const data =
		payload && typeof payload === "object" ? (payload as { data?: unknown }).data : undefined;

	return Array.isArray(data) ? data : undefined;
}

function couldNotCheck(what: string, failure: FailedCall): string {
	return `couldn't check ${what}: ${failure.status ? `status ${failure.status}` : "network error"}`;
}

function agentError(identifier: string, failure: FailedCall): ApiResponse {
	const message =
		failure.status === 404
			? `Error: Agent "${identifier}" was not found in this environment. Call get_agents to list agents.`
			: `Error: Failed to look up agent "${identifier}". Status: ${failure.status || "network error"}, Message: ${failure.errorText}`;

	return ToolFactory.errorResult({
		message,
		retryAfter: failure.retryAfter,
		status: failure.status || undefined,
	});
}
