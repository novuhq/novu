import { ContentIssueEnum, type ContentOverrideProviderId, getProviderPrimaryContentKey } from '@novu/shared';
import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { RiErrorWarningLine, RiLightbulbLine } from 'react-icons/ri';
import { InputRoot } from '@/components/primitives/input';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { SectionHeader } from '@/components/workflow-editor/steps/http-request/section-header';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { getUnsupportedOverrideKeys, PROVIDER_OVERRIDES_FIELD, type ProviderOverrides } from './content-source';
import { createOverrideCompletionSource } from './override-autocomplete';
import {
  type AnnotateOverrideField,
  type DescribeOverrideField,
  defaultValueForFieldSchema,
  getEagerRootSchema,
  type OverrideFieldSchema,
} from './override-field-schema';
import { findDuplicateRootKey } from './override-json';
import { OverrideSupportedFields } from './override-supported-fields';

function formatOverrideJson(value: Record<string, unknown> | undefined): string {
  return JSON.stringify(value ?? {}, null, 2);
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

type ProviderOverrideEditorProps = {
  providerId: ContentOverrideProviderId;
  displayName: string;
  /** Replaces the default hint with channel-specific copy. */
  notice?: ReactNode;
  headerTooltip?: string;
  placeholder?: string;
  /** Takes the place of the registry schema, e.g. the tool webhook's merged payload schemas. */
  rootSchemaOverride?: OverrideFieldSchema;
  describeField?: DescribeOverrideField;
  annotateField?: AnnotateOverrideField;
  onDraftParseValidityChange?: (providerId: ContentOverrideProviderId, isParseValid: boolean) => void;
};

export function ProviderOverrideEditor({
  providerId,
  displayName,
  notice,
  headerTooltip,
  placeholder,
  rootSchemaOverride,
  describeField,
  annotateField,
  onDraftParseValidityChange,
}: ProviderOverrideEditorProps) {
  const { control, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const rootSchema = rootSchemaOverride ?? getEagerRootSchema(providerId);
  const primaryKey = getProviderPrimaryContentKey(providerId) ?? undefined;

  const [draft, setDraft] = useState(() =>
    formatOverrideJson((getValues(PROVIDER_OVERRIDES_FIELD) as ProviderOverrides | undefined)?.[providerId])
  );

  useEffect(() => {
    setDraft(formatOverrideJson((getValues(PROVIDER_OVERRIDES_FIELD) as ProviderOverrides | undefined)?.[providerId]));
  }, [getValues, providerId]);

  const { parseError, parsedDraft } = useMemo(() => {
    const { parsed, error } = parseOverrideJson(draft);
    if (error || !parsed) {
      return { parseError: error, parsedDraft: undefined };
    }

    return { parseError: undefined, parsedDraft: parsed };
  }, [draft]);

  // Unsupported keys are detected client-side from the shared override schema (it
  // tracks the draft keystroke-by-keystroke); server UNSUPPORTED_PROPERTY issues are
  // skipped here so the same key is never reported twice.
  const activeServerIssues = useMemo(() => {
    const controlIssues = step?.issues?.controls ?? {};
    const prefix = `${PROVIDER_OVERRIDES_FIELD}.${providerId}`;

    return Object.entries(controlIssues)
      .filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
      .flatMap(([path, issueList]) =>
        issueList
          .filter((issue) => issue.issueType !== ContentIssueEnum.UNSUPPORTED_PROPERTY)
          .map((issue) => ({ ...issue, path }))
      )
      .filter((issue) => {
        if (!parsedDraft) {
          return true;
        }

        const issuePath = issue.variableName ?? issue.path;
        if (!issuePath.startsWith(`${prefix}.`)) {
          return true;
        }

        const topKey = issuePath.slice(prefix.length + 1).split('.')[0];

        return topKey in parsedDraft;
      });
  }, [step?.issues?.controls, providerId, parsedDraft]);

  const localUnsupportedPropertyMessages = useMemo(() => {
    if (!parsedDraft) {
      return [] as string[];
    }

    return getUnsupportedOverrideKeys(providerId, parsedDraft).map((key) => `"${key}" is not a supported property`);
  }, [parsedDraft, providerId]);

  const usedDraftKeys = useMemo(() => new Set(Object.keys(parsedDraft ?? {})), [parsedDraft]);

  const completionSources = useMemo(
    () => [createOverrideCompletionSource({ rootSchema, describeField })],
    [describeField, rootSchema]
  );

  useEffect(() => {
    onDraftParseValidityChange?.(providerId, !parseError);

    return () => {
      onDraftParseValidityChange?.(providerId, true);
    };
  }, [onDraftParseValidityChange, parseError, providerId]);

  const getInsertedFieldValue = (key: string): unknown => defaultValueForFieldSchema(rootSchema?.properties?.[key]);

  const resolvedTooltip =
    headerTooltip ??
    (primaryKey
      ? `These fields merge over your default content. "${primaryKey}" falls back to the default message unless set here. Supports Liquid variables inside string values.`
      : 'These fields are merged into the provider payload as-is. Supports Liquid variables inside string values.');

  const resolvedPlaceholder = placeholder ?? `{\n  "${primaryKey ?? 'key'}": "{{payload.title}}"\n}`;

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <Controller
        control={control}
        name={PROVIDER_OVERRIDES_FIELD}
        render={({ field }) => {
          const writeProviderOverride = (next: Record<string, unknown>) => {
            const current = (field.value as ProviderOverrides | undefined) ?? {};
            field.onChange({
              ...current,
              [providerId]: next,
            });
            saveForm();
          };

          const handleInsertField = (key: string) => {
            if (!parsedDraft || usedDraftKeys.has(key)) {
              return;
            }

            const next = {
              ...parsedDraft,
              [key]: getInsertedFieldValue(key),
            };
            setDraft(formatOverrideJson(next));
            writeProviderOverride(next);
          };

          return (
            <>
              <SectionHeader
                label="Override fields"
                tooltip={resolvedTooltip}
                rightSlot={
                  <OverrideSupportedFields
                    providerId={providerId}
                    displayName={displayName}
                    rootSchema={rootSchema}
                    usedKeys={usedDraftKeys}
                    canInsert={!parseError}
                    annotateField={annotateField}
                    onInsertField={handleInsertField}
                  />
                }
              />
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
                  onChange={(val) => {
                    const newVal = typeof val === 'string' ? val : '';
                    setDraft(newVal);

                    const { parsed, error } = parseOverrideJson(newVal);
                    if (error || !parsed) {
                      return;
                    }

                    writeProviderOverride(parsed);
                  }}
                  onBlur={() => {
                    field.onBlur();
                  }}
                />
              </InputRoot>
              {parseError ? (
                <div className="flex items-center gap-1 px-1">
                  <RiErrorWarningLine className="text-destructive h-3 w-3 shrink-0" />
                  <span className="text-destructive text-xs">{parseError}</span>
                </div>
              ) : (
                <>
                  {activeServerIssues.map((issue) => (
                    <div key={issue.variableName ?? issue.path} className="flex items-start gap-1 px-1">
                      <RiErrorWarningLine className="text-destructive mt-0.5 h-3 w-3 shrink-0" />
                      <span className="text-destructive text-xs">{issue.message}</span>
                    </div>
                  ))}
                  {localUnsupportedPropertyMessages.map((message) => (
                    <div key={message} className="flex items-start gap-1 px-1">
                      <RiErrorWarningLine className="text-destructive mt-0.5 h-3 w-3 shrink-0" />
                      <span className="text-destructive text-xs">{message}</span>
                    </div>
                  ))}
                </>
              )}
              {(notice || primaryKey) && (
                <div className="text-text-soft flex items-start gap-1 px-1 py-0.5">
                  <RiLightbulbLine className="mt-0.5 size-3 shrink-0" />
                  {notice ?? (
                    <span className="text-xs">
                      Fields merge over default content. <code className="text-[11px]">{primaryKey}</code> falls back to
                      your default message unless set here.
                    </span>
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
