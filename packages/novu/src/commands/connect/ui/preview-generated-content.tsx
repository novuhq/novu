import { MultiSelect, TextInput } from '@inkjs/ui';
import { Box, Text, useInput, useStdout } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { GeneratedAgentSpec } from '../api/agents';
import {
  buildMcpSelectOptions,
  buildSkillSelectOptions,
  buildToolSelectOptions,
  formatCapabilitySummary,
  MAX_PREVIEW_MCP_SERVERS,
  MAX_PREVIEW_SKILLS,
  resolveGeneratedAgentSpecLabels,
  slugifyAgentIdentifier,
  validateEditedAgentSpec,
  wrapPreviewLines,
} from './agent-spec-labels';
import type { GeneratedAgentPreviewResult } from './ui';

type PreviewTextFieldId = 'name' | 'identifier' | 'systemPrompt';
type PreviewMultiFieldId = 'tools' | 'mcpServers' | 'skills';

type PreviewRow =
  | { id: PreviewTextFieldId; kind: 'text'; label: string }
  | { id: PreviewMultiFieldId; kind: 'multi'; label: string }
  | { id: 'create' | 'regenerate'; kind: 'action'; label: string; hint?: string };

type PreviewMode = 'browse' | 'edit-text' | 'edit-multi';

const PREVIEW_ROWS: PreviewRow[] = [
  { id: 'name', kind: 'text', label: 'Name' },
  { id: 'identifier', kind: 'text', label: 'Identifier' },
  { id: 'systemPrompt', kind: 'text', label: 'System prompt' },
  { id: 'tools', kind: 'multi', label: 'Tools' },
  { id: 'mcpServers', kind: 'multi', label: 'MCP' },
  { id: 'skills', kind: 'multi', label: 'Skills' },
  { id: 'create', kind: 'action', label: 'Create this agent', hint: '→' },
  { id: 'regenerate', kind: 'action', label: 'Regenerate from description', hint: '↺' },
];

const CREATE_ROW_INDEX = PREVIEW_ROWS.findIndex((row) => row.id === 'create');

const FIELD_LABEL_WIDTH = 15;

function isPreviewTextFieldId(id: PreviewRow['id']): id is PreviewTextFieldId {
  return id === 'name' || id === 'identifier' || id === 'systemPrompt';
}

function isPreviewMultiFieldId(id: PreviewRow['id']): id is PreviewMultiFieldId {
  return id === 'tools' || id === 'mcpServers' || id === 'skills';
}

export function PreviewGeneratedContent({
  spec,
  onResolve,
  morphComplete,
}: {
  spec: GeneratedAgentSpec;
  onResolve: (result: GeneratedAgentPreviewResult) => void;
  morphComplete: boolean;
}): React.ReactElement {
  const { stdout } = useStdout();
  const contentWidth = Math.max(48, Math.min(72, stdout.columns - 6));
  const [draft, setDraft] = React.useState<GeneratedAgentSpec>(() => cloneSpec(spec));
  const [identifierTouched, setIdentifierTouched] = React.useState(false);
  const [focusIdx, setFocusIdx] = React.useState(CREATE_ROW_INDEX);
  const [mode, setMode] = React.useState<PreviewMode>('browse');
  const [editRowId, setEditRowId] = React.useState<PreviewRow['id'] | null>(null);
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const labels = React.useMemo(() => resolveGeneratedAgentSpecLabels(draft), [draft]);
  const focusedRow = PREVIEW_ROWS[focusIdx];

  React.useEffect(() => {
    setDraft(cloneSpec(spec));
    setIdentifierTouched(false);
    setFocusIdx(CREATE_ROW_INDEX);
    setMode('browse');
    setEditRowId(null);
    setValidationError(null);
  }, [spec]);

  useInput((_input, key) => {
    if (!morphComplete || mode !== 'browse') {
      return;
    }

    if (key.upArrow) {
      setFocusIdx((current) => (current - 1 + PREVIEW_ROWS.length) % PREVIEW_ROWS.length);
      setValidationError(null);
    } else if (key.downArrow) {
      setFocusIdx((current) => (current + 1) % PREVIEW_ROWS.length);
      setValidationError(null);
    } else if (key.return || _input === ' ') {
      handleBrowseActivate(focusedRow);
    }
  });

  function handleBrowseActivate(row: PreviewRow): void {
    if (row.kind === 'action') {
      if (row.id === 'create') {
        confirmDraft();

        return;
      }

      onResolve({ action: 'refine' });

      return;
    }

    setValidationError(null);
    setEditRowId(row.id);
    setMode(row.kind === 'text' ? 'edit-text' : 'edit-multi');
  }

  function confirmDraft(): void {
    const normalized = normalizeDraft(draft);
    const error = validateEditedAgentSpec(normalized);

    if (error) {
      setValidationError(error);

      return;
    }

    onResolve({ action: 'confirm', spec: normalized });
  }

  function updateDraft(next: GeneratedAgentSpec): void {
    setDraft(next);
    setValidationError(null);
  }

  function finishTextEdit(value: string): void {
    const trimmed = value.trim();

    if (editRowId === 'name') {
      updateDraft({
        ...draft,
        name: trimmed,
        identifier: identifierTouched ? draft.identifier : slugifyAgentIdentifier(trimmed),
      });
    } else if (editRowId === 'identifier') {
      setIdentifierTouched(true);
      updateDraft({
        ...draft,
        identifier: slugifyAgentIdentifier(trimmed),
      });
    } else if (editRowId === 'systemPrompt') {
      updateDraft({
        ...draft,
        systemPrompt: value.trimEnd(),
      });
    }

    setMode('browse');
    setEditRowId(null);
    setFocusIdx(CREATE_ROW_INDEX);
  }

  function finishMultiEdit(values: string[]): void {
    if (editRowId === 'tools') {
      updateDraft({ ...draft, tools: values });
    } else if (editRowId === 'mcpServers') {
      if (values.length > MAX_PREVIEW_MCP_SERVERS) {
        setValidationError(`Select at most ${MAX_PREVIEW_MCP_SERVERS} MCP servers.`);

        return;
      }

      updateDraft({ ...draft, mcpServers: values });
    } else if (editRowId === 'skills') {
      if (values.length > MAX_PREVIEW_SKILLS) {
        setValidationError(`Select at most ${MAX_PREVIEW_SKILLS} skills.`);

        return;
      }

      updateDraft({
        ...draft,
        skills: values.map((skillId) => ({ skillId })),
      });
    }

    setMode('browse');
    setEditRowId(null);
    setFocusIdx(CREATE_ROW_INDEX);
  }

  function cancelEdit(): void {
    setMode('browse');
    setEditRowId(null);
    setValidationError(null);
    setFocusIdx(CREATE_ROW_INDEX);
  }

  if (!morphComplete) {
    return (
      <Box flexDirection="column" alignItems="center">
        <Text dimColor>Shaping your agent…</Text>
      </Box>
    );
  }

  if (mode === 'edit-text' && editRowId && isPreviewTextFieldId(editRowId)) {
    return (
      <PreviewTextEditor
        rowId={editRowId}
        draft={draft}
        contentWidth={contentWidth}
        onSubmit={finishTextEdit}
        onCancel={cancelEdit}
      />
    );
  }

  if (mode === 'edit-multi' && editRowId && isPreviewMultiFieldId(editRowId)) {
    return (
      <PreviewMultiEditor
        rowId={editRowId}
        draft={draft}
        contentWidth={contentWidth}
        onSubmit={finishMultiEdit}
        onCancel={cancelEdit}
        validationError={validationError}
      />
    );
  }

  const promptPreview = wrapPreviewLines(draft.systemPrompt, contentWidth - FIELD_LABEL_WIDTH - 2, 3);

  return (
    <Box flexDirection="column" gap={1} width={contentWidth} alignItems="flex-start">
      <Text bold color="#e9d5ff">
        Your agent, shaped
      </Text>
      <Text dimColor>↑ adjust fields · Enter to create</Text>

      <Box flexDirection="column" alignItems="flex-start">
        {PREVIEW_ROWS.map((row, index) => {
          const isFocused = index === focusIdx;
          const isPrimaryAction = row.id === 'create';

          if (row.kind === 'action') {
            const showActionDivider = index === CREATE_ROW_INDEX;

            return (
              <Box key={row.id} flexDirection="column" alignItems="flex-start" marginTop={showActionDivider ? 1 : 0}>
                {showActionDivider ? <Text dimColor>Ready when you are</Text> : null}
                {isPrimaryAction ? (
                  <Text>
                    <Text bold color={isFocused ? 'cyan' : 'white'}>
                      {isFocused ? '› ' : '  '}
                      {row.label}
                    </Text>
                    <Text bold color={isFocused ? 'cyan' : undefined}>
                      {isFocused ? ` ${row.hint ?? ''}` : ' · Enter'}
                    </Text>
                  </Text>
                ) : (
                  <Text dimColor={!isFocused}>
                    <Text color={isFocused ? 'cyan' : undefined}>
                      {isFocused ? '› ' : '  '}
                      {row.label}
                    </Text>
                    {isFocused && row.hint ? <Text dimColor>{` ${row.hint}`}</Text> : null}
                  </Text>
                )}
              </Box>
            );
          }

          if (row.id === 'systemPrompt') {
            return (
              <Box key={row.id} flexDirection="column" alignItems="flex-start">
                <PreviewFieldLabel label={row.label} focused={isFocused} />
                <Box paddingLeft={2} flexDirection="column" alignItems="flex-start">
                  {promptPreview.lines.map((line, lineIndex) => (
                    <Text key={`${row.id}-${lineIndex}`} color={isFocused ? 'cyan' : undefined} dimColor={!isFocused}>
                      {line}
                    </Text>
                  ))}
                  {promptPreview.truncated ? <Text dimColor>…</Text> : null}
                </Box>
              </Box>
            );
          }

          const value = (() => {
            if (row.id === 'name') return draft.name;
            if (row.id === 'identifier') return draft.identifier;
            if (row.id === 'tools') return formatCapabilitySummary(labels.tools);
            if (row.id === 'mcpServers') return formatCapabilitySummary(labels.mcpServers);
            if (row.id === 'skills') return formatCapabilitySummary(labels.skills);

            return row.label;
          })();

          return (
            <PreviewFieldRow key={row.id} label={row.label} value={value} focused={isFocused} />
          );
        })}
      </Box>

      {validationError ? <Text color="red">{validationError}</Text> : null}
    </Box>
  );
}

function PreviewFieldLabel({ label, focused }: { label: string; focused: boolean }): React.ReactElement {
  return (
    <Text color={focused ? 'cyan' : undefined}>
      {focused ? '› ' : '  '}
      {label}
    </Text>
  );
}

function PreviewFieldRow({
  label,
  value,
  focused,
}: {
  label: string;
  value: string;
  focused: boolean;
}): React.ReactElement {
  return (
    <Text wrap="truncate">
      <Text color={focused ? 'cyan' : undefined}>{focused ? '› ' : '  '}</Text>
      <Text color={focused ? 'cyan' : undefined}>{`${label.padEnd(FIELD_LABEL_WIDTH)}`}</Text>
      <Text dimColor={!focused}>{value}</Text>
    </Text>
  );
}

function PreviewTextEditor({
  rowId,
  draft,
  contentWidth,
  onSubmit,
  onCancel,
}: {
  rowId: PreviewTextFieldId;
  draft: GeneratedAgentSpec;
  contentWidth: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const title = PREVIEW_ROWS.find((row) => row.id === rowId)?.label ?? 'Field';
  const defaultValue = (() => {
    if (rowId === 'name') return draft.name;
    if (rowId === 'identifier') return draft.identifier;

    return draft.systemPrompt;
  })();
  const placeholder = (() => {
    if (rowId === 'name') return 'Customer Support Agent';
    if (rowId === 'identifier') return 'customer-support-agent';

    return 'You are a helpful agent that…';
  })();

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" gap={1} width={contentWidth} alignItems="flex-start">
      <Text bold color="#e9d5ff">{`Edit ${title.toLowerCase()}`}</Text>
      <Text dimColor>Enter save · Esc cancel</Text>
      <Box borderStyle="round" borderColor="#c084fc" paddingX={1} width={contentWidth - 2}>
        <TextInput defaultValue={defaultValue} placeholder={placeholder} onSubmit={onSubmit} />
      </Box>
      {rowId === 'identifier' ? <Text dimColor>Lowercase kebab-case · synced from name until you edit it.</Text> : null}
    </Box>
  );
}

function PreviewMultiEditor({
  rowId,
  draft,
  contentWidth,
  onSubmit,
  onCancel,
  validationError,
}: {
  rowId: PreviewMultiFieldId;
  draft: GeneratedAgentSpec;
  contentWidth: number;
  onSubmit: (values: string[]) => void;
  onCancel: () => void;
  validationError: string | null;
}): React.ReactElement {
  const title = PREVIEW_ROWS.find((row) => row.id === rowId)?.label ?? 'Selection';
  const options = (() => {
    if (rowId === 'tools') return buildToolSelectOptions();
    if (rowId === 'mcpServers') return buildMcpSelectOptions();

    return buildSkillSelectOptions();
  })();
  const defaultValue = (() => {
    if (rowId === 'tools') return draft.tools;
    if (rowId === 'mcpServers') return draft.mcpServers;

    return draft.skills.map((skill) => skill.skillId);
  })();
  const limitHint = (() => {
    if (rowId === 'mcpServers') return `Select up to ${MAX_PREVIEW_MCP_SERVERS}.`;
    if (rowId === 'skills') return `Select up to ${MAX_PREVIEW_SKILLS}.`;

    return 'Toggle with space · Enter when done.';
  })();

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  return (
    <Box flexDirection="column" gap={1} width={contentWidth} alignItems="flex-start">
      <Text bold color="#e9d5ff">{`Edit ${title.toLowerCase()}`}</Text>
      <Text dimColor>{`${limitHint} Esc cancel.`}</Text>
      <MultiSelect options={options} defaultValue={defaultValue} visibleOptionCount={6} onSubmit={onSubmit} />
      {validationError ? <Text color="red">{validationError}</Text> : null}
    </Box>
  );
}

function cloneSpec(spec: GeneratedAgentSpec): GeneratedAgentSpec {
  return {
    name: spec.name,
    identifier: spec.identifier,
    systemPrompt: spec.systemPrompt,
    tools: [...spec.tools],
    mcpServers: [...spec.mcpServers],
    skills: spec.skills.map((skill) => ({ skillId: skill.skillId })),
  };
}

function normalizeDraft(spec: GeneratedAgentSpec): GeneratedAgentSpec {
  return {
    name: spec.name.trim(),
    identifier: spec.identifier.trim(),
    systemPrompt: spec.systemPrompt.trim(),
    tools: [...spec.tools],
    mcpServers: [...spec.mcpServers],
    skills: spec.skills.map((skill) => ({ skillId: skill.skillId.trim() })).filter((skill) => skill.skillId),
  };
}
