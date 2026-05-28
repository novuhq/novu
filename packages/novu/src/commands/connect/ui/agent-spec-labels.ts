import {
  CLAUDE_ANTHROPIC_SKILLS,
  CLAUDE_BUILTIN_TOOLS,
  MCP_SERVERS,
  slugify,
} from '@novu/shared';
import type { GeneratedAgentSpec } from '../api/agents';

const TOOL_LABELS = new Map(CLAUDE_BUILTIN_TOOLS.map((tool) => [tool.type, tool.name]));
const MCP_LABELS = new Map(MCP_SERVERS.map((server) => [server.id, server.name]));
const SKILL_LABELS = new Map(CLAUDE_ANTHROPIC_SKILLS.map((skill) => [skill.skillId, skill.name]));

export const MAX_PREVIEW_MCP_SERVERS = 5;
export const MAX_PREVIEW_SKILLS = 4;

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

  return slug.slice(0, 60) || 'agent';
}

export function validateEditedAgentSpec(spec: GeneratedAgentSpec): string | null {
  const name = spec.name.trim();
  const identifier = spec.identifier.trim();
  const systemPrompt = spec.systemPrompt.trim();

  if (!name) {
    return 'Agent name is required.';
  }

  if (name.length > 60) {
    return 'Agent name must be 60 characters or fewer.';
  }

  if (!identifier) {
    return 'Agent identifier is required.';
  }

  if (!/^[a-z0-9-]+$/.test(identifier)) {
    return 'Identifier must be lowercase letters, numbers, and dashes only.';
  }

  if (identifier.length > 60) {
    return 'Identifier must be 60 characters or fewer.';
  }

  if (!systemPrompt) {
    return 'System prompt is required.';
  }

  if (systemPrompt.length > 4000) {
    return 'System prompt must be 4000 characters or fewer.';
  }

  if (spec.mcpServers.length > MAX_PREVIEW_MCP_SERVERS) {
    return `Select at most ${MAX_PREVIEW_MCP_SERVERS} MCP servers.`;
  }

  if (spec.skills.length > MAX_PREVIEW_SKILLS) {
    return `Select at most ${MAX_PREVIEW_SKILLS} skills.`;
  }

  return null;
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

export function formatCapabilitySummary(labels: string[]): string {
  if (labels.length === 0) {
    return 'None selected';
  }

  return labels.join(', ');
}
