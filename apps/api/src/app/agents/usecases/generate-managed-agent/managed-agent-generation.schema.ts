import { CLAUDE_ANTHROPIC_SKILLS, CLAUDE_BUILTIN_TOOLS, MCP_SERVERS } from '@novu/shared';
import { z } from 'zod';

/**
 * Allow-lists for the LLM. The LLM must pick from these enum-like string unions so
 * we cannot end up with hallucinated tools/MCP IDs/skill IDs that would fail
 * downstream when we forward the generated JSON to the Anthropic Managed Agents API.
 */
const TOOL_TYPES = CLAUDE_BUILTIN_TOOLS.map((tool) => tool.type) as [string, ...string[]];
const MCP_SERVER_IDS = MCP_SERVERS.map((server) => server.id) as [string, ...string[]];
const SKILL_IDS = CLAUDE_ANTHROPIC_SKILLS.map((skill) => skill.skillId) as [string, ...string[]];

/** Anthropic caps `mcp_servers` length; pick a conservative limit. */
export const MAX_GENERATED_MCP_SERVERS = 5;
export const MAX_GENERATED_SKILLS = 4;

export const managedAgentGenerationSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(60)
    .describe('Human readable agent name. Title case, 2–4 words (e.g., "PR Security Reviewer").'),
  identifier: z
    .string()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Identifier must be lowercase kebab-case')
    .describe('Stable kebab-case identifier derived from the name (e.g., "pr-security-reviewer").'),
  systemPrompt: z
    .string()
    .min(1)
    .max(4000)
    .describe(
      'The full system prompt sent to Claude. Speak in second person to the agent ("You are…"). Describe role, scope, tone, and the workflow it should follow. Reference the available tools/MCPs/skills naturally without hard-coding them.'
    ),
  tools: z
    .array(z.enum(TOOL_TYPES))
    .min(0)
    .max(TOOL_TYPES.length)
    .describe(
      `Subset of Claude built-in tool types this agent should have. Pick only tools the prompt actually needs. Valid values: ${TOOL_TYPES.join(', ')}.`
    ),
  mcpServers: z
    .array(z.enum(MCP_SERVER_IDS))
    .min(0)
    .max(MAX_GENERATED_MCP_SERVERS)
    .describe(
      `MCP server catalog IDs the agent should be connected to. Only attach servers directly required by the prompt. Up to ${MAX_GENERATED_MCP_SERVERS} servers.`
    ),
  skills: z
    .array(
      z.object({
        skillId: z.enum(SKILL_IDS).describe('Anthropic pre-built skill identifier.'),
      })
    )
    .min(0)
    .max(MAX_GENERATED_SKILLS)
    .describe(
      `Optional Anthropic pre-built skills to attach (e.g., "xlsx", "pdf"). Skip unless the prompt clearly needs file generation. Up to ${MAX_GENERATED_SKILLS} skills.`
    ),
});

export type ManagedAgentGenerationOutput = z.infer<typeof managedAgentGenerationSchema>;
