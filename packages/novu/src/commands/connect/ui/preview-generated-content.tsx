import { MultiSelect, TextInput } from '@inkjs/ui';
import { MAX_GENERATED_MCP_SERVERS, MAX_GENERATED_SKILLS, validateManagedAgentSpec } from '@novu/shared';
import { Box, Text, useInput, useStdout } from 'ink';
// biome-ignore lint/correctness/noUnusedImports: classic-JSX linter falls back here because tsconfig.json excludes ui/.
import React from 'react';
import type { GeneratedAgentSpec } from '../api/agents';
import { type CatalogSelectOption, wrapPreviewLines } from './agent-spec-labels';
import {
  applyPreviewMultiEdit,
  applyPreviewTextEdit,
  getPreviewFieldLabel,
  PREVIEW_CREATE_ROW_INDEX,
  PREVIEW_FIELD_LABEL_WIDTH,
  PREVIEW_FIELD_ROWS,
  type PreviewFieldRow,
  type PreviewMultiFieldId,
  type PreviewTextFieldId,
  readPreviewFieldValue,
  readPreviewMultiDefaultValue,
  readPreviewMultiOptions,
  readPreviewTextDefaultValue,
  readPreviewTextPlaceholder,
} from './preview-field-config';
import type { GeneratedAgentPreviewResult } from './ui';

type PreviewUiState =
  | { kind: 'browse'; focusIdx: number }
  | { kind: 'edit-text'; fieldId: PreviewTextFieldId }
  | { kind: 'edit-multi'; fieldId: PreviewMultiFieldId };

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
  const [uiState, setUiState] = React.useState<PreviewUiState>({
    kind: 'browse',
    focusIdx: PREVIEW_CREATE_ROW_INDEX,
  });
  const [validationError, setValidationError] = React.useState<string | null>(null);

  const focusedRow = uiState.kind === 'browse' ? PREVIEW_FIELD_ROWS[uiState.focusIdx] : null;

  React.useEffect(() => {
    setDraft(cloneSpec(spec));
    setIdentifierTouched(false);
    setUiState({ kind: 'browse', focusIdx: PREVIEW_CREATE_ROW_INDEX });
    setValidationError(null);
  }, [spec]);

  useInput((_input, key) => {
    if (!morphComplete || uiState.kind !== 'browse' || !focusedRow) {
      return;
    }

    if (key.upArrow) {
      setUiState({
        kind: 'browse',
        focusIdx: (uiState.focusIdx - 1 + PREVIEW_FIELD_ROWS.length) % PREVIEW_FIELD_ROWS.length,
      });
      setValidationError(null);
    } else if (key.downArrow) {
      setUiState({
        kind: 'browse',
        focusIdx: (uiState.focusIdx + 1) % PREVIEW_FIELD_ROWS.length,
      });
      setValidationError(null);
    } else if (key.return) {
      handleBrowseActivate(focusedRow);
    }
  });

  function handleBrowseActivate(row: PreviewFieldRow): void {
    if (row.kind === 'action') {
      if (row.id === 'create') {
        confirmDraft();

        return;
      }

      onResolve({ action: 'refine' });

      return;
    }

    setValidationError(null);
    setUiState(row.kind === 'text' ? { kind: 'edit-text', fieldId: row.id } : { kind: 'edit-multi', fieldId: row.id });
  }

  function confirmDraft(): void {
    const normalized = normalizeDraft(draft);
    const error = validateManagedAgentSpec(normalized);

    if (error) {
      setValidationError(error);

      return;
    }

    onResolve({ action: 'confirm', spec: normalized });
  }

  function finishTextEdit(value: string): void {
    if (uiState.kind !== 'edit-text') {
      return;
    }

    const fieldId = uiState.fieldId;
    const result = applyPreviewTextEdit(fieldId, draft, value, identifierTouched);

    setDraft(result.draft);
    if (result.identifierTouched) {
      setIdentifierTouched(true);
    }
    setValidationError(null);
    setUiState({ kind: 'browse', focusIdx: PREVIEW_CREATE_ROW_INDEX });
  }

  function finishMultiEdit(values: string[]): void {
    if (uiState.kind !== 'edit-multi') {
      return;
    }

    const fieldId = uiState.fieldId;

    if (fieldId === 'mcpServers' && values.length > MAX_GENERATED_MCP_SERVERS) {
      setValidationError(`Select at most ${MAX_GENERATED_MCP_SERVERS} MCP servers.`);

      return;
    }

    if (fieldId === 'skills' && values.length > MAX_GENERATED_SKILLS) {
      setValidationError(`Select at most ${MAX_GENERATED_SKILLS} skills.`);

      return;
    }

    setDraft((current) => applyPreviewMultiEdit(fieldId, current, values));
    setValidationError(null);
    setUiState({ kind: 'browse', focusIdx: PREVIEW_CREATE_ROW_INDEX });
  }

  function cancelEdit(): void {
    setUiState({ kind: 'browse', focusIdx: PREVIEW_CREATE_ROW_INDEX });
    setValidationError(null);
  }

  if (!morphComplete) {
    return (
      <Box flexDirection="column" alignItems="center">
        <Text dimColor>Shaping your agent…</Text>
      </Box>
    );
  }

  if (uiState.kind === 'edit-text') {
    return (
      <PreviewTextEditor
        fieldId={uiState.fieldId}
        draft={draft}
        contentWidth={contentWidth}
        onSubmit={finishTextEdit}
        onCancel={cancelEdit}
      />
    );
  }

  if (uiState.kind === 'edit-multi') {
    return (
      <PreviewMultiEditor
        fieldId={uiState.fieldId}
        draft={draft}
        contentWidth={contentWidth}
        onSubmit={finishMultiEdit}
        onCancel={cancelEdit}
        validationError={validationError}
      />
    );
  }

  const promptPreview = wrapPreviewLines(draft.systemPrompt, contentWidth - PREVIEW_FIELD_LABEL_WIDTH - 2, 3);

  return (
    <Box flexDirection="column" gap={1} width={contentWidth} alignItems="flex-start">
      <Text bold color="#e9d5ff">
        Your agent, shaped
      </Text>
      <Text dimColor>↑ adjust fields · Enter to create</Text>

      <Box flexDirection="column" alignItems="flex-start">
        {PREVIEW_FIELD_ROWS.map((row, index) => {
          const isFocused = index === uiState.focusIdx;
          const isPrimaryAction = row.id === 'create';

          if (row.kind === 'action') {
            const showActionDivider = index === PREVIEW_CREATE_ROW_INDEX;

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

          const value = readPreviewFieldValue(row.id, draft);

          return <PreviewFieldRow key={row.id} label={row.label} value={value} focused={isFocused} />;
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
      <Text color={focused ? 'cyan' : undefined}>{`${label.padEnd(PREVIEW_FIELD_LABEL_WIDTH)}`}</Text>
      <Text dimColor={!focused}>{value}</Text>
    </Text>
  );
}

function PreviewTextEditor({
  fieldId,
  draft,
  contentWidth,
  onSubmit,
  onCancel,
}: {
  fieldId: PreviewTextFieldId;
  draft: GeneratedAgentSpec;
  contentWidth: number;
  onSubmit: (value: string) => void;
  onCancel: () => void;
}): React.ReactElement {
  const title = getPreviewFieldLabel(fieldId);
  const defaultValue = readPreviewTextDefaultValue(fieldId, draft);
  const placeholder = readPreviewTextPlaceholder(fieldId);

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
      {fieldId === 'identifier' ? (
        <Text dimColor>Lowercase kebab-case · synced from name until you edit it.</Text>
      ) : null}
    </Box>
  );
}

function sortSelectedFirst(options: CatalogSelectOption[], selectedValues: string[]): CatalogSelectOption[] {
  const selectedSet = new Set(selectedValues);
  const selected: CatalogSelectOption[] = [];
  const unselected: CatalogSelectOption[] = [];

  for (const option of options) {
    if (selectedSet.has(option.value)) {
      selected.push(option);
    } else {
      unselected.push(option);
    }
  }

  return [...selected, ...unselected];
}

function PreviewMultiEditor({
  fieldId,
  draft,
  contentWidth,
  onSubmit,
  onCancel,
  validationError,
}: {
  fieldId: PreviewMultiFieldId;
  draft: GeneratedAgentSpec;
  contentWidth: number;
  onSubmit: (values: string[]) => void;
  onCancel: () => void;
  validationError: string | null;
}): React.ReactElement {
  const title = getPreviewFieldLabel(fieldId);
  const defaultValue = readPreviewMultiDefaultValue(fieldId, draft);
  const options = sortSelectedFirst(readPreviewMultiOptions(fieldId), defaultValue);
  const limitHint = (() => {
    if (fieldId === 'mcpServers') return `Select up to ${MAX_GENERATED_MCP_SERVERS}.`;
    if (fieldId === 'skills') return `Select up to ${MAX_GENERATED_SKILLS}.`;

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
