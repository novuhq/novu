import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
	type AgentRuntimeIntegration,
	agentResourcePath,
	buildCreateAgentBody,
	buildUpdateAgentBody,
	connectAgentInputSchema,
	createAgentInputSchema,
	findAgentRuntimeIntegration,
	getAgentInputSchema,
	listAgentsInputSchema,
	updateAgentInputSchema,
} from "../utils/agent-schemas";
import { NovuApiUtils } from "../utils/api";
import { buildConnectAgentOverlay } from "../utils/connect-cli";
import type { ToolAccessors } from "../utils/tool-accessors";
import { ToolFactory } from "../utils/tool-factory";

const ANALYTICS_SOURCE_HEADER = { "Novu-Analytics-Source": "mcp" };

const CREATE_AGENT_DESCRIPTION = [
	"Create a Novu agent in the current environment.",
	"Defaults to a managed (Novu-hosted) agent using the demo novu-anthropic integration — no Anthropic API key required.",
	"Pass runtime:'self-hosted' for a bridge agent that runs in your app.",
	"For managed agents with your own credentials, pass integrationId from get_integrations (entries where kind==='agent').",
	"Never pass an Anthropic API key to this tool.",
	"Optional managed fields: systemPrompt, model, tools, mcpServers, skills.",
	'After success, call connect_agent with the returned identifier to connect a channel. Do not ask the user for Slack, Telegram, or other channel tokens. To route a workflow through this agent, call update_workflow (or create_workflow) with agent: { identifier: "<slug>" }.',
].join(" ");

const CONNECT_AGENT_DESCRIPTION = [
	"Get instructions to connect a channel (Slack, Telegram, Email, WhatsApp, Teams, Agent Chat, iMessage) to an existing Novu agent.",
	"Call this after create_agent, or with an identifier from get_agents.",
	"Returns the Novu CLI playbook URL plus mandatory flags so you attach a channel to THIS agent — do not create a second agent, and never pass --keyless.",
	"Never accept channel secrets (Slack tokens, Telegram bot tokens, Sendblue keys) as tool arguments.",
].join(" ");

const UPDATE_AGENT_DESCRIPTION = [
	"Update an existing Novu agent by its identifier (slug).",
	"Provide at least one field to change.",
	"In production environments only active and bridgeUrl may be modified — name, description, and behavior fields return 403.",
	"Behavior fields (acknowledgeOnReceived, reactionOnResolved, subscriberAccess) are flattened and merged on the server.",
].join(" ");

export function registerAgentTools(server: McpServer, accessors: ToolAccessors) {
	ToolFactory.createTool(server, accessors, {
		description: CREATE_AGENT_DESCRIPTION,
		handler: async (input, context) => {
			const runtime = input.runtime ?? "managed";
			let resolved = null;

			if (runtime === "managed") {
				const integrations = await fetchIntegrations(context);
				if (integrations === null) {
					return {
						content: [
							{
								text: "Error: Failed to list integrations while resolving a managed-runtime integration. Retry or pass runtime:'self-hosted'.",
								type: "text" as const,
							},
						],
					};
				}

				resolved = findAgentRuntimeIntegration(integrations, {
					integrationId: input.integrationId,
				});

				if (!resolved) {
					const guidance = input.integrationId
						? `No kind:'agent' integration found with _id "${input.integrationId}". Call get_integrations and pass a valid agent-runtime integrationId, or set runtime:'self-hosted'.`
						: "No demo novu-anthropic (kind:'agent') integration found in this environment. Pass an explicit integrationId from get_integrations (kind==='agent'), or set runtime:'self-hosted'.";

					return {
						content: [
							{
								text: `Error: ${guidance}`,
								type: "text" as const,
							},
						],
					};
				}
			}

			const body = buildCreateAgentBody(input, resolved);

			return ToolFactory.makeApiRequest(
				context,
				{
					body,
					customHeaders: ANALYTICS_SOURCE_HEADER,
					endpoint: "/v1/agents",
					formatSuccess: (data) => formatCreatedAgent(data, body.identifier as string),
					identifier: body.identifier as string,
					method: "POST",
					successMessage: "created agent",
				},
				context.idempotencyKey,
			);
		},
		name: "create_agent",
		schema: createAgentInputSchema,
	});

	ToolFactory.createQueryGetTool(
		server,
		accessors,
		"get_agents",
		"List agents in the current environment with cursor pagination. Filter by partial identifier when needed.",
		"fetched agents",
		listAgentsInputSchema,
		{
			buildEndpoint: (input) => {
				const params = NovuApiUtils.buildQueryParams({
					after: input.after,
					before: input.before,
					identifier: input.identifier,
					limit: input.limit,
				});
				const query = params.toString();

				return query ? `/v1/agents?${query}` : "/v1/agents";
			},
		},
	);

	ToolFactory.createQueryGetTool(
		server,
		accessors,
		"get_agent",
		"Retrieve a single agent by its identifier (slug), including runtime config when managed.",
		"fetched agent",
		getAgentInputSchema,
		{
			buildEndpoint: (input) => agentResourcePath(input.identifier),
			getIdentifier: (input) => input.identifier,
		},
	);

	ToolFactory.createTool(server, accessors, {
		description: CONNECT_AGENT_DESCRIPTION,
		handler: async (input, context) => {
			const agent = await fetchAgentByIdentifier(context, input.identifier);
			if (agent === "not_found") {
				return {
					content: [
						{
							text: `Error: Agent "${input.identifier}" was not found. Call get_agents to list agents, or create_agent first.`,
							type: "text" as const,
						},
					],
				};
			}
			if (agent === null) {
				return {
					content: [
						{
							text: `Error: Failed to look up agent "${input.identifier}". Retry, or call get_agents.`,
							type: "text" as const,
						},
					],
				};
			}

			const name =
				typeof agent.name === "string" && agent.name.trim() ? agent.name : input.identifier;
			const identifier =
				typeof agent.identifier === "string" ? agent.identifier : input.identifier;

			return {
				content: [
					{
						text: buildConnectAgentOverlay({
							apiUrl: context.apiUrl,
							channel: input.channel,
							identifier,
							name,
						}),
						type: "text" as const,
					},
				],
			};
		},
		name: "connect_agent",
		schema: connectAgentInputSchema,
	});

	ToolFactory.createTool(server, accessors, {
		description: UPDATE_AGENT_DESCRIPTION,
		handler: async (input, context) => {
			const { identifier, ...fields } = input;
			const body = buildUpdateAgentBody({ ...fields, identifier });

			if (Object.keys(body).length === 0) {
				return {
					content: [
						{
							text: "Error: At least one field must be provided to update an agent.",
							type: "text" as const,
						},
					],
				};
			}

			return ToolFactory.makeApiRequest(
				context,
				{
					body,
					endpoint: agentResourcePath(identifier),
					identifier,
					method: "PATCH",
					successMessage: "updated agent",
				},
				context.idempotencyKey,
			);
		},
		name: "update_agent",
		schema: updateAgentInputSchema,
	});
}

async function fetchIntegrations(context: {
	apiUrl: string;
	environmentId?: string;
	idempotencyKey?: string;
	token: string;
}): Promise<AgentRuntimeIntegration[] | null> {
	const headers = NovuApiUtils.prepareHeaders(context.token, {
		environmentId: context.environmentId,
		idempotencyKey: context.idempotencyKey,
	});

	try {
		const response = await fetch(`${context.apiUrl}/v1/integrations`, {
			headers,
			method: "GET",
		});

		if (!response.ok) {
			console.error("Failed to fetch integrations for agent create:", response.status);

			return null;
		}

		const payload = (await response.json()) as
			| { data?: AgentRuntimeIntegration[] }
			| AgentRuntimeIntegration[];

		if (Array.isArray(payload)) {
			return payload;
		}

		if (payload && Array.isArray(payload.data)) {
			return payload.data;
		}

		return [];
	} catch (error) {
		console.error("Error fetching integrations for agent create:", error);

		return null;
	}
}

function formatCreatedAgent(data: unknown, requestedIdentifier: string): string {
	const record = unwrapAgentRecord(data);
	const returnedIdentifier =
		typeof record?.identifier === "string" ? record.identifier : requestedIdentifier;
	const note =
		returnedIdentifier !== requestedIdentifier
			? ` (requested "${requestedIdentifier}" collided; API assigned "${returnedIdentifier}")`
			: "";

	return [
		`Successfully created agent "${returnedIdentifier}"${note}.`,
		`Next: call connect_agent with identifier "${returnedIdentifier}" to connect a channel. Do not ask the user for Slack, Telegram, or other channel tokens.`,
		JSON.stringify(data, null, 2),
	].join("\n\n");
}

async function fetchAgentByIdentifier(
	context: { apiUrl: string; environmentId?: string; idempotencyKey?: string; token: string },
	identifier: string,
): Promise<Record<string, unknown> | "not_found" | null> {
	const headers = NovuApiUtils.prepareHeaders(context.token, {
		environmentId: context.environmentId,
		idempotencyKey: context.idempotencyKey,
	});

	try {
		const response = await fetch(`${context.apiUrl}${agentResourcePath(identifier)}`, {
			headers,
			method: "GET",
		});

		if (response.status === 404) {
			return "not_found";
		}

		if (!response.ok) {
			console.error("Failed to fetch agent for connect_agent:", response.status);

			return null;
		}

		const payload: unknown = await response.json();
		const record = unwrapAgentRecord(payload);

		return record ?? { identifier };
	} catch (error) {
		console.error("Error fetching agent for connect_agent:", error);

		return null;
	}
}

function unwrapAgentRecord(data: unknown): Record<string, unknown> | null {
	if (!data || typeof data !== "object") {
		return null;
	}

	const envelope = data as { data?: unknown };
	if (envelope.data && typeof envelope.data === "object" && !Array.isArray(envelope.data)) {
		return envelope.data as Record<string, unknown>;
	}

	return data as Record<string, unknown>;
}
