import { getProviderPrimaryContentKey, setAtPath } from '@novu/shared';
import { Braces } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { RiErrorWarningLine, RiLightbulbLine } from 'react-icons/ri';
import { InputRoot } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { SectionHeader } from '@/components/workflow-editor/steps/http-request/section-header';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { EscapeHatchCallout } from './escape-hatch-callout';
import { createOverrideCompletionSource } from './override-autocomplete';
import { OverrideEmptyState } from './override-empty-state';
import {
  type AnnotateOverrideField,
  type DescribeOverrideField,
  type OverrideFieldSchema,
} from './override-field-schema';
import type { OverrideInheritance } from './override-inheritance';
import { getUnsupportedOverrideKeys, type OverrideServerIssue } from './override-issues';
import { findDuplicateRootKey } from './override-json';
import { overriddenKeyChips } from './override-key-chips';
import { isEscapeHatchProvider } from './override-options';
import {
  getOverrideFormField,
  getOverridePath,
  getSourceOverride,
  type OverrideContentSource,
  updateSourceOverride,
} from './override-source';
import { OverrideSupportedFields } from './override-supported-fields';
import { createSchemaResolver } from './schema-resolver';
import { readOverrideValues } from './use-provider-override-options';
import { useProviderOverrideSchema } from './use-provider-override-schema';

function formatOverrideJson(value: Record<string, unknown> | undefined): string {
  return JSON.stringify(value ?? {}, null, 2);
}

/** Pretty-prints valid JSON object drafts; leaves invalid / non-object input unchanged. */
function formatOverrideJsonDraft(value: string): string {
  if (!value.trim()) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return value;
    }

    return JSON.stringify(parsed, null, 2);
  } catch {
    return value;
  }
}

/**
 * Server issues carry the full control path (e.g. `providerOverrides.slack.blocks.0.status`) in
 * `variableName`, but their message only names the leaf field ("Status is required"). Derive the
 * path relative to this override, with array indices in bracket notation (`blocks[0].status`), so
 * nested errors point at a location. Top-level fields return undefined — the message already names
 * them.
 */
function formatIssueLocation(issuePath: string, pathPrefix: string): string | undefined {
  if (!issuePath.startsWith(`${pathPrefix}.`)) {
    return undefined;
  }

  const segments = issuePath.slice(pathPrefix.length + 1).split('.');
  if (segments.length <= 1) {
    return undefined;
  }

  let location = '';

  for (const segment of segments) {
    if (/^\d+$/.test(segment)) {
      location += `[${segment}]`;
    } else {
      location += location ? `.${segment}` : segment;
    }
  }

  return location;
}

function parseOverrideJson(value: string): { parsed?: Record<string, unknown>; error?: string } {
  if (!value.trim()) {
    return { error: 'Override must be a JSON object' };
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { error: 'Override must be a JSON object' };
    }

    const duplicateKey = findDuplicateRootKey(value);
    if (duplicateKey) {
      return { error: `Duplicate key "${duplicateKey}"` };
    }

    return { parsed };
  } catch {
    return { error: 'Invalid JSON syntax' };
  }
}

export type ProviderOverrideNoticeContext = {
  parsedDraft?: Record<string, unknown>;
};

export type ProviderOverrideNotice = ReactNode | ((context: ProviderOverrideNoticeContext) => ReactNode);

export type ProviderOverrideEditorProps = {
  source: OverrideContentSource;
  displayName: string;
  inheritance?: OverrideInheritance;
  /** The step's server control issues owned by this override (`buildOverrideIssueIndex`). */
  serverIssues: OverrideServerIssue[];
  /**
   * Replaces both the schema-less callout and the default hint with channel-specific copy. Rendered
   * into a bare padded block, so it owns its own icon and row layout.
   */
  notice?: ProviderOverrideNotice;
  headerTooltip?: string;
  placeholder?: string;
  /** Takes the place of the registry schema, e.g. the tool webhook's merged payload schemas. */
  rootSchemaOverride?: OverrideFieldSchema;
  describeField?: DescribeOverrideField;
  annotateField?: AnnotateOverrideField;
  onDraftParseValidityChange?: (overridePath: string, isParseValid: boolean) => void;
};

export function ProviderOverrideEditor({
  source,
  displayName,
  inheritance,
  serverIssues,
  notice,
  headerTooltip,
  placeholder,
  rootSchemaOverride,
  describeField,
  annotateField,
  onDraftParseValidityChange,
}: ProviderOverrideEditorProps) {
  const { providerId } = source;
  const { control, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const { isReadOnly } = useStepEditor();
  const registrySchema = useProviderOverrideSchema(providerId);
  const rootSchema = rootSchemaOverride ?? registrySchema.rootSchema;
  // A top-level-keys-only schema has no types or descriptions, so it drives completion but must not
  // reach the popover, whose rows would list every field as `any` and insert the wrong default.
  const browsableSchema = rootSchemaOverride ?? (registrySchema.isTopLevelKeysOnly ? undefined : rootSchema);
  const schemaStatus = registrySchema.isLoading ? `Loading ${displayName} fields…` : undefined;
  // One resolver per schema, shared by completion and the supported-fields popover so they hit the
  // same deref cache. Keyed on schema identity: a provider switch or a lazy load swaps the schema
  // object, which rebuilds it, while a re-render on the same schema reuses it.
  const resolver = useMemo(() => (rootSchema ? createSchemaResolver(rootSchema) : undefined), [rootSchema]);
  // `browsableSchema` is either `rootSchema` or nothing, so the same resolver serves both.
  const browsableResolver = browsableSchema ? resolver : undefined;
  const primaryKey = getProviderPrimaryContentKey(providerId) ?? undefined;
  const showEscapeHatchCallout = !notice && isEscapeHatchProvider(providerId);

  // The panel remounts the editor per source, so the draft is only seeded from the form once.
  const [draft, setDraft] = useState(() =>
    formatOverrideJson(getSourceOverride(source, readOverrideValues(getValues)))
  );
  // Only an override that opens empty gets the empty state; clearing keys while editing keeps the editor.
  const [isEmptyStateVisible, setIsEmptyStateVisible] = useState(
    () => Object.keys(getSourceOverride(source, readOverrideValues(getValues)) ?? {}).length === 0
  );

  const overriddenKeyLabelsJson = JSON.stringify(inheritance?.overriddenKeyLabels ?? {});
  const editorExtensions = useMemo(() => {
    const labels = JSON.parse(overriddenKeyLabelsJson) as Record<string, string>;

    return Object.keys(labels).length > 0 ? [overriddenKeyChips(labels)] : undefined;
  }, [overriddenKeyLabelsJson]);

  const formatJson = useCallback(() => {
    setDraft((current) => formatOverrideJsonDraft(current));
  }, []);

  const { parseError, parsedDraft } = useMemo(() => {
    const { parsed, error } = parseOverrideJson(draft);
    if (error || !parsed) {
      return { parseError: error, parsedDraft: undefined };
    }

    return { parseError: undefined, parsedDraft: parsed };
  }, [draft]);

  const issuePathPrefix = getOverridePath(source);

  // Server issues for keys the draft no longer has are stale until the next save round-trip.
  const activeServerIssues = useMemo(() => {
    if (!parsedDraft) {
      return serverIssues;
    }

    return serverIssues.filter((issue) => {
      const issuePath = issue.variableName ?? issue.path;
      if (!issuePath.startsWith(`${issuePathPrefix}.`)) {
        return true;
      }

      const topKey = issuePath.slice(issuePathPrefix.length + 1).split('.')[0];

      return topKey in parsedDraft;
    });
  }, [serverIssues, issuePathPrefix, parsedDraft]);

  // Top-level unsupported keys are checked against the draft keystroke by keystroke; the server's
  // own UNSUPPORTED_PROPERTY issues for them are already left out of `serverIssues`.
  const localUnsupportedPropertyMessages = useMemo(() => {
    if (!parsedDraft) {
      return [] as string[];
    }

    return getUnsupportedOverrideKeys(providerId, parsedDraft).map((key) => `"${key}" is not a supported property`);
  }, [parsedDraft, providerId]);

  const usedDraftKeys = useMemo(() => new Set(Object.keys(parsedDraft ?? {})), [parsedDraft]);

  const completionSources = useMemo(
    () => [createOverrideCompletionSource({ resolver, describeField })],
    [describeField, resolver]
  );

  useEffect(() => {
    onDraftParseValidityChange?.(issuePathPrefix, !parseError);

    return () => {
      onDraftParseValidityChange?.(issuePathPrefix, true);
    };
  }, [onDraftParseValidityChange, parseError, issuePathPrefix]);

  const resolvedTooltip =
    headerTooltip ??
    (primaryKey
      ? `These fields merge over your default content. "${primaryKey}" falls back to the default message unless set here. Supports Liquid variables inside string values.`
      : 'These fields are merged into the provider payload as-is. Supports Liquid variables inside string values.');

  const resolvedPlaceholder =
    placeholder ??
    JSON.stringify(primaryKey ? setAtPath({}, primaryKey, '{{payload.title}}') : { key: '{{payload.title}}' }, null, 2);

  const resolvedNotice = typeof notice === 'function' ? notice({ parsedDraft }) : notice;

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <Controller
        control={control}
        name={getOverrideFormField(source)}
        render={({ field }) => {
          const writeOverride = (next: Record<string, unknown>) => {
            field.onChange(updateSourceOverride(source, readOverrideValues(getValues), next));
            saveForm();
          };

          const replaceOverride = (next: Record<string, unknown>) => {
            setDraft(formatOverrideJson(next));
            writeOverride(next);
            setIsEmptyStateVisible(false);
          };

          const handleInsertField = (key: string) => {
            if (!parsedDraft || usedDraftKeys.has(key)) {
              return;
            }

            replaceOverride({
              ...parsedDraft,
              [key]: browsableResolver?.defaultValue(browsableSchema?.properties?.[key]) ?? '',
            });
          };

          if (inheritance && isEmptyStateVisible) {
            const inheritedOverride = inheritance.inheritedOverride;
            const hasFieldPicker = Object.keys(browsableResolver?.rootSchema.properties ?? {}).length > 0;

            return (
              <>
                <SectionHeader
                  label="Override fields"
                  tooltip={resolvedTooltip}
                  rightSlot={<span className="text-paragraph-xs text-text-soft">0 keys</span>}
                />
                <OverrideEmptyState
                  message={inheritance.emptyMessage}
                  canEdit={!isReadOnly}
                  renderFieldPicker={
                    hasFieldPicker
                      ? (trigger) => (
                          <OverrideSupportedFields
                            providerId={providerId}
                            displayName={displayName}
                            resolver={browsableResolver}
                            usedKeys={usedDraftKeys}
                            canInsert={!isReadOnly}
                            annotateField={annotateField}
                            trigger={trigger}
                            onInsertField={handleInsertField}
                          />
                        )
                      : undefined
                  }
                  onAddKey={(key) => replaceOverride({ [key]: '' })}
                  onCopyInheritedKeys={
                    inheritedOverride ? () => replaceOverride(structuredClone(inheritedOverride)) : undefined
                  }
                />
              </>
            );
          }

          return (
            <>
              <SectionHeader
                label="Override fields"
                tooltip={resolvedTooltip}
                rightSlot={
                  <div className="flex items-center gap-2">
                    {schemaStatus && <span className="text-text-soft text-[11px]">{schemaStatus}</span>}
                    <OverrideSupportedFields
                      providerId={providerId}
                      displayName={displayName}
                      resolver={browsableResolver}
                      usedKeys={usedDraftKeys}
                      canInsert={!parseError && !isReadOnly}
                      annotateField={annotateField}
                      onInsertField={handleInsertField}
                    />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          aria-label="Format JSON"
                          className="text-text-sub hover:text-text-strong flex items-center justify-center transition-colors disabled:opacity-50"
                          onClick={formatJson}
                          disabled={isReadOnly}
                        >
                          <Braces className="size-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Format JSON</TooltipContent>
                    </Tooltip>
                  </div>
                }
              />
              {showEscapeHatchCallout && (
                <div className="px-1 pb-1">
                  <EscapeHatchCallout providerId={providerId} displayName={displayName} />
                </div>
              )}
              <InputRoot className="min-h-[180px]" hasError={!!parseError}>
                <ControlInput
                  size="2xs"
                  multiline={true}
                  indentWithTab={true}
                  placeholder={resolvedPlaceholder}
                  value={draft}
                  isAllowedVariable={isAllowedVariable}
                  variables={variables}
                  completionSources={completionSources}
                  extensions={editorExtensions}
                  onChange={(val) => {
                    const newVal = typeof val === 'string' ? val : '';
                    setDraft(newVal);

                    const { parsed, error } = parseOverrideJson(newVal);
                    if (error || !parsed) {
                      return;
                    }

                    writeOverride(parsed);
                  }}
                  onBlur={() => {
                    field.onBlur();
                  }}
                  readOnly={isReadOnly}
                />
              </InputRoot>
              {parseError ? (
                <div className="flex items-center gap-1 px-1">
                  <RiErrorWarningLine className="text-destructive h-3 w-3 shrink-0" />
                  <span className="text-destructive text-xs">{parseError}</span>
                </div>
              ) : (
                <>
                  {activeServerIssues.map((issue) => {
                    const issuePath = issue.variableName ?? issue.path;
                    const location = formatIssueLocation(issuePath, issuePathPrefix);

                    return (
                      <div key={`${issuePath}:${issue.message}`} className="flex items-start gap-1 px-1">
                        <RiErrorWarningLine className="text-destructive mt-0.5 h-3 w-3 shrink-0" />
                        <span className="text-destructive text-xs">
                          {location && (
                            <>
                              <code className="text-[11px]">{location}</code>
                              {' — '}
                            </>
                          )}
                          {issue.message}
                        </span>
                      </div>
                    );
                  })}
                  {localUnsupportedPropertyMessages.map((message) => (
                    <div key={message} className="flex items-start gap-1 px-1">
                      <RiErrorWarningLine className="text-destructive mt-0.5 h-3 w-3 shrink-0" />
                      <span className="text-destructive text-xs">{message}</span>
                    </div>
                  ))}
                </>
              )}
              {(resolvedNotice || primaryKey) && (
                <div className="px-1 py-0.5">
                  {resolvedNotice ?? (
                    <div className="text-text-soft flex items-start gap-1">
                      <RiLightbulbLine className="mt-0.5 size-3 shrink-0" />
                      <span className="min-w-0 flex-1 text-xs">
                        Fields merge over default content. <code className="text-[11px]">{primaryKey}</code> falls back
                        to your default message unless set here.
                      </span>
                    </div>
                  )}
                </div>
              )}
            </>
          );
        }}
      />
    </div>
  );
}
