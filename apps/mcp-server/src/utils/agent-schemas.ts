import { z } from "zod";

export const AGENT_NAME_MAX_LENGTH = 60;
export const AGENT_IDENTIFIER_MAX_LENGTH = 60;

/** Matches Novu's SLUG_IDENTIFIER_REGEX for agent identifiers. */
export const SLUG_IDENTIFIER_REGEX = /^[a-zA-Z0-9]+(?:[-_.][a-zA-Z0-9]+)*$/;

/** Agent slug used in `/v1/agents/:identifier` — rejects path separators and `..`. */
export const agentIdentifierSchema = z
	.string()
	.min(1)
	.max(AGENT_IDENTIFIER_MAX_LENGTH)
	.regex(SLUG_IDENTIFIER_REGEX)
	.describe("The agent identifier (slug) — letters, numbers, -, _, . — not the Mongo _id");

export const agentRuntimeSchema = z.enum(["self-hosted", "managed"]);

export const agentSkillSchema = z.object({
	skillId: z.string().describe('Skill identifier, e.g. "xlsx" or "skill_01XJ5..."'),
	type: z.enum(["anthropic", "custom"]).describe("Skill type"),
	version: z.string().optional().describe("Version to pin. Omit for latest."),
});

export const createAgentInputSchema = z.object({
	active: z.boolean().optional().describe("Whether the agent is active. Defaults to true."),
	description: z.string().optional().describe("Optional description of the agent"),
	identifier: agentIdentifierSchema
		.optional()
		.describe(
			"Unique slug identifier for the agent (letters, numbers, -, _, .). Auto-derived from name when omitted.",
		),
	integrationId: z
		.string()
		.optional()
		.describe(
			"Mongo _id of a kind:'agent' integration (from get_integrations). Required only when not using the demo novu-anthropic integration. Never pass an Anthropic API key.",
		),
	mcpServers: z
		.array(z.string())
		.optional()
		.describe("MCP server identifiers to attach (managed runtime only)"),
	model: z
		.string()
		.optional()
		.describe("Model override for the managed runtime (e.g. claude-opus-4-5)"),
	name: z
		.string()
		.min(1)
		.max(AGENT_NAME_MAX_LENGTH)
		.describe("Human-readable agent name (max 60 characters)"),
	runtime: agentRuntimeSchema
		.optional()
		.describe(
			"Agent runtime. Defaults to 'managed' (Novu-hosted demo Claude). Use 'self-hosted' for a bridge agent that runs in your app.",
		),
	skills: z
		.array(agentSkillSchema)
		.optional()
		.describe("Skills to attach (managed runtime only)"),
	systemPrompt: z.string().optional().describe("System prompt for the managed agent brain"),
	tools: z
		.array(z.string())
		.optional()
		.describe("Builtin tool identifiers to enable (managed runtime only), e.g. web_search"),
});

export const updateAgentInputSchema = z.object({
	acknowledgeOnReceived: z
		.boolean()
		.optional()
		.describe("Whether the agent acknowledges messages on receipt (behavior)"),
	active: z.boolean().optional().describe("Whether the agent is active"),
	bridgeUrl: z.string().optional().describe("Production bridge URL for self-hosted agents"),
	description: z.string().optional().describe("Updated description"),
	devBridgeActive: z
		.boolean()
		.optional()
		.describe("Whether the dev bridge is active (not allowed in production environments)"),
	devBridgeUrl: z
		.string()
		.optional()
		.describe("Dev tunnel bridge URL (not allowed in production environments)"),
	identifier: agentIdentifierSchema.describe(
		"The agent identifier (slug) to update — not the Mongo _id",
	),
	name: z
		.string()
		.max(AGENT_NAME_MAX_LENGTH)
		.optional()
		.describe("Updated name (not allowed in production environments)"),
	reactionOnResolved: z
		.string()
		.nullable()
		.optional()
		.describe(
			"Well-known emoji name to react with when a conversation is resolved, or null to clear",
		),
	subscriberAccess: z
		.enum(["open", "restricted"])
		.optional()
		.describe("Who can start conversations with this agent"),
});

export const listAgentsInputSchema = z.object({
	after: z.string().optional().describe("Cursor for the next page of results"),
	before: z.string().optional().describe("Cursor for the previous page of results"),
	identifier: z
		.string()
		.optional()
		.describe("Partial case-insensitive filter on agent identifier"),
	limit: z.number().int().min(1).max(100).optional().describe("Page size (default 10)"),
});

export const connectAgentChannelSchema = z.enum([
	"agent-chat",
	"email",
	"sendblue",
	"skip",
	"slack",
	"teams",
	"telegram",
	"whatsapp",
]);

export const connectAgentInputSchema = z.object({
	channel: connectAgentChannelSchema
		.optional()
		.describe(
			"Channel to connect via `npx novu connect`. Omit to let the playbook channel picker run.",
		),
	identifier: agentIdentifierSchema.describe(
		"The agent identifier (slug) to connect a channel to — not the Mongo _id",
	),
});

export const getAgentInputSchema = z.object({
	identifier: agentIdentifierSchema.describe(
		"The agent identifier (slug) to retrieve — not the Mongo _id",
	),
});

export type CreateAgentInput = z.infer<typeof createAgentInputSchema>;
export type UpdateAgentInput = z.infer<typeof updateAgentInputSchema>;

export function agentResourcePath(identifier: string): string {
	return `/v1/agents/${encodeURIComponent(identifier)}`;
}

export interface AgentRuntimeIntegration {
	_id: string;
	active?: boolean;
	kind?: string;
	providerId?: string;
	[key: string]: unknown;
}

export interface ResolvedAgentRuntimeIntegration {
	integrationId: string;
	providerId: string;
}

/**
 * Slugify an agent name into an identifier, matching the Novu CLI's
 * `deriveAgentIdentifier` so MCP- and CLI-created agents look alike.
 */
export function deriveAgentIdentifier(name: string): string {
	const slug = name
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 50);

	return slug || "my-agent";
}

/**
 * Resolve a kind:'agent' integration for managed-runtime create.
 * When `integrationId` is given, match by `_id`; otherwise pick the active
 * novu-anthropic demo integration.
 */
export function findAgentRuntimeIntegration(
	integrations: AgentRuntimeIntegration[],
	options?: { integrationId?: string },
): ResolvedAgentRuntimeIntegration | null {
	if (options?.integrationId) {
		const match = integrations.find((integration) => integration._id === options.integrationId);
		if (!match?.providerId) {
			return null;
		}

		return {
			integrationId: match._id,
			providerId: match.providerId,
		};
	}

	const demo = integrations.find(
		(integration) =>
			integration.providerId === "novu-anthropic" &&
			integration.kind === "agent" &&
			integration.active !== false,
	);

	if (!demo?.providerId) {
		return null;
	}

	return {
		integrationId: demo._id,
		providerId: demo.providerId,
	};
}

/**
 * Assemble the nested `POST /v1/agents` body from the flat MCP tool input.
 */
export function buildCreateAgentBody(
	input: CreateAgentInput,
	resolved?: ResolvedAgentRuntimeIntegration | null,
): Record<string, unknown> {
	const identifier = input.identifier?.trim() || deriveAgentIdentifier(input.name);
	const runtime = input.runtime ?? "managed";

	const body: Record<string, unknown> = {
		identifier,
		name: input.name.trim(),
		runtime,
	};

	if (input.description !== undefined) {
		body.description = input.description;
	}
	if (input.active !== undefined) {
		body.active = input.active;
	}

	if (runtime === "managed" && resolved) {
		const managedRuntime: Record<string, unknown> = {
			integrationId: resolved.integrationId,
			providerId: resolved.providerId,
		};

		if (input.model !== undefined) {
			managedRuntime.model = input.model;
		}
		if (input.systemPrompt !== undefined) {
			managedRuntime.systemPrompt = input.systemPrompt;
		}
		if (input.tools !== undefined) {
			managedRuntime.tools = input.tools;
		}
		if (input.mcpServers !== undefined) {
			managedRuntime.mcpServers = input.mcpServers;
		}
		if (input.skills !== undefined) {
			managedRuntime.skills = input.skills;
		}

		body.managedRuntime = managedRuntime;
	}

	return body;
}

/**
 * Regroup flat update fields into the nested PATCH body the API expects.
 */
export function buildUpdateAgentBody(input: UpdateAgentInput): Record<string, unknown> {
	const body: Record<string, unknown> = {};

	if (input.name !== undefined) {
		body.name = input.name;
	}
	if (input.description !== undefined) {
		body.description = input.description;
	}
	if (input.active !== undefined) {
		body.active = input.active;
	}
	if (input.bridgeUrl !== undefined) {
		body.bridgeUrl = input.bridgeUrl;
	}
	if (input.devBridgeUrl !== undefined) {
		body.devBridgeUrl = input.devBridgeUrl;
	}
	if (input.devBridgeActive !== undefined) {
		body.devBridgeActive = input.devBridgeActive;
	}

	const hasBehavior =
		input.acknowledgeOnReceived !== undefined ||
		input.reactionOnResolved !== undefined ||
		input.subscriberAccess !== undefined;

	if (hasBehavior) {
		const behavior: Record<string, unknown> = {};
		if (input.acknowledgeOnReceived !== undefined) {
			behavior.acknowledgeOnReceived = input.acknowledgeOnReceived;
		}
		if (input.reactionOnResolved !== undefined) {
			behavior.reactionOnResolved = input.reactionOnResolved;
		}
		if (input.subscriberAccess !== undefined) {
			behavior.subscriberAccess = input.subscriberAccess;
		}
		body.behavior = behavior;
	}

	return body;
}
