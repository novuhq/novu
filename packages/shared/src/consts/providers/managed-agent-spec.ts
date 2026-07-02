import { CLAUDE_ANTHROPIC_SKILLS } from './claude-skills';
import { CLAUDE_BUILTIN_TOOLS } from './claude-tools';
import { MCP_SERVERS } from './mcp-servers';

export const MAX_GENERATED_MCP_SERVERS = 5;
export const MAX_GENERATED_SKILLS = 4;
export const MANAGED_AGENT_NAME_MAX_LENGTH = 60;
export const MANAGED_AGENT_IDENTIFIER_MAX_LENGTH = 60;
export const MANAGED_AGENT_SYSTEM_PROMPT_MAX_LENGTH = 4000;

const MANAGED_AGENT_IDENTIFIER_REGEX = /^[a-z0-9-]+$/;
const MANAGED_AGENT_TOOL_IDS = new Set(CLAUDE_BUILTIN_TOOLS.map((tool) => tool.type));
const MANAGED_AGENT_MCP_IDS = new Set(MCP_SERVERS.map((server) => server.id));
const MANAGED_AGENT_SKILL_IDS = new Set(CLAUDE_ANTHROPIC_SKILLS.map((skill) => skill.skillId));

export type ManagedAgentSpecInput = {
  name: string;
  identifier: string;
  systemPrompt: string;
  tools: string[];
  mcpServers: string[];
  skills: Array<{ skillId: string }>;
};

export function validateManagedAgentSpec(spec: ManagedAgentSpecInput): string | null {
  const name = spec.name.trim();
  const identifier = spec.identifier.trim();
  const systemPrompt = spec.systemPrompt.trim();

  if (!name) {
    return 'Agent name is required.';
  }

  if (name.length > MANAGED_AGENT_NAME_MAX_LENGTH) {
    return `Agent name must be ${MANAGED_AGENT_NAME_MAX_LENGTH} characters or fewer.`;
  }

  if (!identifier) {
    return 'Agent identifier is required.';
  }

  if (!MANAGED_AGENT_IDENTIFIER_REGEX.test(identifier)) {
    return 'Identifier must be lowercase letters, numbers, and dashes only.';
  }

  if (identifier.length > MANAGED_AGENT_IDENTIFIER_MAX_LENGTH) {
    return `Identifier must be ${MANAGED_AGENT_IDENTIFIER_MAX_LENGTH} characters or fewer.`;
  }

  if (!systemPrompt) {
    return 'System prompt is required.';
  }

  if (systemPrompt.length > MANAGED_AGENT_SYSTEM_PROMPT_MAX_LENGTH) {
    return `System prompt must be ${MANAGED_AGENT_SYSTEM_PROMPT_MAX_LENGTH} characters or fewer.`;
  }

  for (const toolId of spec.tools) {
    if (!MANAGED_AGENT_TOOL_IDS.has(toolId)) {
      return `Unknown tool "${toolId}".`;
    }
  }

  if (spec.mcpServers.length > MAX_GENERATED_MCP_SERVERS) {
    return `Select at most ${MAX_GENERATED_MCP_SERVERS} MCP servers.`;
  }

  for (const mcpId of spec.mcpServers) {
    if (!MANAGED_AGENT_MCP_IDS.has(mcpId)) {
      return `Unknown MCP server "${mcpId}".`;
    }
  }

  if (spec.skills.length > MAX_GENERATED_SKILLS) {
    return `Select at most ${MAX_GENERATED_SKILLS} skills.`;
  }

  for (const skill of spec.skills) {
    if (!MANAGED_AGENT_SKILL_IDS.has(skill.skillId)) {
      return `Unknown skill "${skill.skillId}".`;
    }
  }

  return null;
}
