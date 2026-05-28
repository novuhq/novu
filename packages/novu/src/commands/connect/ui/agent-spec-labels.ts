import { CLAUDE_ANTHROPIC_SKILLS, CLAUDE_BUILTIN_TOOLS, MCP_SERVERS } from '@novu/shared';
import type { GeneratedAgentSpec } from '../api/agents';

const TOOL_LABELS = new Map(CLAUDE_BUILTIN_TOOLS.map((tool) => [tool.type, tool.name]));
const MCP_LABELS = new Map(MCP_SERVERS.map((server) => [server.id, server.name]));
const SKILL_LABELS = new Map(CLAUDE_ANTHROPIC_SKILLS.map((skill) => [skill.skillId, skill.name]));

export type GeneratedAgentSpecLabels = {
  tools: string[];
  mcpServers: string[];
  skills: string[];
};

export function resolveGeneratedAgentSpecLabels(spec: GeneratedAgentSpec): GeneratedAgentSpecLabels {
  return {
    tools: spec.tools.map((id) => TOOL_LABELS.get(id) ?? id),
    mcpServers: spec.mcpServers.map((id) => MCP_LABELS.get(id) ?? id),
    skills: spec.skills.map((skill) => SKILL_LABELS.get(skill.skillId) ?? skill.skillId),
  };
}

export function wrapPreviewLines(text: string, maxWidth: number, maxLines: number): { lines: string[]; truncated: boolean } {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { lines: ['—'], truncated: false };
  }

  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
    } else {
      lines.push(word.slice(0, maxWidth));
      current = word.slice(maxWidth);
    }

    if (lines.length >= maxLines) {
      return { lines: lines.slice(0, maxLines), truncated: true };
    }
  }

  if (lines.length < maxLines && current) {
    lines.push(current);
  }

  return { lines: lines.slice(0, maxLines), truncated: false };
}
