import {
  CLAUDE_ANTHROPIC_SKILLS,
  CLAUDE_BUILTIN_TOOLS,
  MANAGED_AGENT_IDENTIFIER_MAX_LENGTH,
  MCP_SERVERS,
  slugify,
} from '@novu/shared';
import type { GeneratedAgentSpec } from '../api/agents';

const TOOL_LABELS = new Map(CLAUDE_BUILTIN_TOOLS.map((tool) => [tool.type, tool.name]));
const MCP_LABELS = new Map(MCP_SERVERS.map((server) => [server.id, server.name]));
const SKILL_LABELS = new Map(CLAUDE_ANTHROPIC_SKILLS.map((skill) => [skill.skillId, skill.name]));

export type CatalogSelectOption = {
  label: string;
  value: string;
};

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

export function buildToolSelectOptions(): CatalogSelectOption[] {
  return CLAUDE_BUILTIN_TOOLS.map((tool) => ({
    label: tool.name,
    value: tool.type,
  }));
}

export function buildMcpSelectOptions(): CatalogSelectOption[] {
  return MCP_SERVERS.filter((server) => server.oauth).map((server) => ({
    label: server.name,
    value: server.id,
  }));
}

export function buildSkillSelectOptions(): CatalogSelectOption[] {
  return CLAUDE_ANTHROPIC_SKILLS.map((skill) => ({
    label: skill.name,
    value: skill.skillId,
  }));
}

export function slugifyAgentIdentifier(name: string): string {
  const slug = slugify(name.trim());

  return slug.slice(0, MANAGED_AGENT_IDENTIFIER_MAX_LENGTH) || 'agent';
}

export function wrapPreviewLines(
  text: string,
  maxWidth: number,
  maxLines: number
): { lines: string[]; truncated: boolean } {
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

export function formatCapabilitySummary(labels: string[]): string {
  if (labels.length === 0) {
    return 'None selected';
  }

  return labels.join(', ');
}
