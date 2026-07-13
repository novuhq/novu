import type { GeneratedAgentSpec } from '../api/agents';
import {
  buildMcpSelectOptions,
  buildSkillSelectOptions,
  buildToolSelectOptions,
  type CatalogSelectOption,
  formatCapabilitySummary,
  resolveGeneratedAgentSpecLabels,
  slugifyAgentIdentifier,
} from './agent-spec-labels';

export type PreviewTextFieldId = 'name' | 'identifier' | 'systemPrompt';
export type PreviewMultiFieldId = 'tools' | 'mcpServers' | 'skills';
export type PreviewEditableFieldId = PreviewTextFieldId | PreviewMultiFieldId;
export type PreviewActionId = 'create' | 'regenerate';

export type PreviewFieldRow =
  | { id: PreviewTextFieldId; kind: 'text'; label: string }
  | { id: PreviewMultiFieldId; kind: 'multi'; label: string }
  | { id: PreviewActionId; kind: 'action'; label: string; hint?: string };

export const PREVIEW_FIELD_ROWS: PreviewFieldRow[] = [
  { id: 'name', kind: 'text', label: 'Name' },
  { id: 'identifier', kind: 'text', label: 'Identifier' },
  { id: 'systemPrompt', kind: 'text', label: 'System prompt' },
  { id: 'tools', kind: 'multi', label: 'Tools' },
  { id: 'mcpServers', kind: 'multi', label: 'MCP' },
  { id: 'skills', kind: 'multi', label: 'Skills' },
  { id: 'create', kind: 'action', label: 'Create this agent', hint: '→' },
  { id: 'regenerate', kind: 'action', label: 'Regenerate from description', hint: '↺' },
];

export const PREVIEW_CREATE_ROW_INDEX = PREVIEW_FIELD_ROWS.findIndex((row) => row.id === 'create');
export const PREVIEW_FIELD_LABEL_WIDTH = 15;

type PreviewFieldUpdateResult = {
  draft: GeneratedAgentSpec;
  identifierTouched?: boolean;
};

export function getPreviewFieldLabel(fieldId: PreviewEditableFieldId): string {
  const row = PREVIEW_FIELD_ROWS.find((item) => item.id === fieldId);

  return row!.label;
}

export function readPreviewFieldValue(fieldId: PreviewEditableFieldId, draft: GeneratedAgentSpec): string {
  if (fieldId === 'name') return draft.name;
  if (fieldId === 'identifier') return draft.identifier;
  if (fieldId === 'systemPrompt') return draft.systemPrompt;

  const labels = resolveGeneratedAgentSpecLabels(draft);
  if (fieldId === 'tools') return formatCapabilitySummary(labels.tools);
  if (fieldId === 'mcpServers') return formatCapabilitySummary(labels.mcpServers);

  return formatCapabilitySummary(labels.skills);
}

export function readPreviewTextDefaultValue(fieldId: PreviewTextFieldId, draft: GeneratedAgentSpec): string {
  if (fieldId === 'name') return draft.name;
  if (fieldId === 'identifier') return draft.identifier;

  return draft.systemPrompt;
}

export function readPreviewTextPlaceholder(fieldId: PreviewTextFieldId): string {
  if (fieldId === 'name') return 'Customer Support Agent';
  if (fieldId === 'identifier') return 'customer-support-agent';

  return 'You are a helpful agent that…';
}

export function readPreviewMultiOptions(fieldId: PreviewMultiFieldId): CatalogSelectOption[] {
  if (fieldId === 'tools') return buildToolSelectOptions();
  if (fieldId === 'mcpServers') return buildMcpSelectOptions();

  return buildSkillSelectOptions();
}

export function readPreviewMultiDefaultValue(fieldId: PreviewMultiFieldId, draft: GeneratedAgentSpec): string[] {
  if (fieldId === 'tools') return draft.tools;
  if (fieldId === 'mcpServers') return draft.mcpServers;

  return draft.skills.map((skill) => skill.skillId);
}

export function applyPreviewTextEdit(
  fieldId: PreviewTextFieldId,
  draft: GeneratedAgentSpec,
  value: string,
  identifierTouched: boolean
): PreviewFieldUpdateResult {
  const trimmed = value.trim();

  if (fieldId === 'name') {
    return {
      draft: {
        ...draft,
        name: trimmed,
        identifier: identifierTouched ? draft.identifier : slugifyAgentIdentifier(trimmed),
      },
    };
  }

  if (fieldId === 'identifier') {
    return {
      draft: {
        ...draft,
        identifier: slugifyAgentIdentifier(trimmed),
      },
      identifierTouched: true,
    };
  }

  return {
    draft: {
      ...draft,
      systemPrompt: value.trimEnd(),
    },
  };
}

export function applyPreviewMultiEdit(
  fieldId: PreviewMultiFieldId,
  draft: GeneratedAgentSpec,
  values: string[]
): GeneratedAgentSpec {
  if (fieldId === 'tools') {
    return { ...draft, tools: values };
  }

  if (fieldId === 'mcpServers') {
    return { ...draft, mcpServers: values };
  }

  return {
    ...draft,
    skills: values.map((skillId) => ({ skillId })),
  };
}
