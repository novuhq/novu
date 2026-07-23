import { ContentIssueEnum, getToolProviderPrimaryContentKey } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { RiErrorWarningLine, RiLightbulbLine } from 'react-icons/ri';
import { InputRoot } from '@/components/primitives/input';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { SectionHeader } from '@/components/workflow-editor/steps/http-request/section-header';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import {
  type DashboardToolContentOverrideProviderId,
  getUnsupportedToolOverrideKeys,
  type ToolProviderOverrides,
  WEBHOOK_TOOL_PROVIDER_ID,
} from './tool-content-source';
import { createToolOverrideCompletionSource } from './tool-override-autocomplete';
import { getToolOverrideFieldDefaultValue, type OverrideFieldSchema } from './tool-override-field-schema';
import { findDuplicateRootKey } from './tool-override-json';
import { ToolOverrideSupportedFields } from './tool-override-supported-fields';
import { formatWebhookSchemaSourceLabel, type WebhookSchemaSourceRef } from './webhook-payload-schema';

const PROVIDER_OVERRIDES_FIELD = 'providerOverrides';

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

type ToolProviderOverrideEditorProps = {
  providerId: DashboardToolContentOverrideProviderId;
  fieldSchemas?: Record<string, OverrideFieldSchema>;
  ignoredSchemaSources?: WebhookSchemaSourceRef[];
  onDraftParseValidityChange?: (providerId: DashboardToolContentOverrideProviderId, isParseValid: boolean) => void;
};

export function ToolProviderOverrideEditor({
  providerId,
  fieldSchemas,
  ignoredSchemaSources = [],
  onDraftParseValidityChange,
}: ToolProviderOverrideEditorProps) {
  const { control, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const isWebhook = providerId === WEBHOOK_TOOL_PROVIDER_ID;
  const primaryKey = isWebhook ? undefined : getToolProviderPrimaryContentKey(providerId);

  const [draft, setDraft] = useState(() =>
    formatOverrideJson((getValues(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined)?.[providerId])
  );

  useEffect(() => {
    setDraft(
      formatOverrideJson((getValues(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined)?.[providerId])
    );
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

    return getUnsupportedToolOverrideKeys(providerId, parsedDraft).map((key) => `"${key}" is not a supported property`);
  }, [parsedDraft, providerId]);

  const usedDraftKeys = useMemo(() => new Set(Object.keys(parsedDraft ?? {})), [parsedDraft]);

  const completionSources = useMemo(
    () => [createToolOverrideCompletionSource(providerId, fieldSchemas)],
    [fieldSchemas, providerId]
  );

  useEffect(() => {
    onDraftParseValidityChange?.(providerId, !parseError);

    return () => {
      onDraftParseValidityChange?.(providerId, true);
    };
  }, [onDraftParseValidityChange, parseError, providerId]);

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <Controller
        control={control}
        name={PROVIDER_OVERRIDES_FIELD}
        render={({ field }) => {
          const writeProviderOverride = (next: Record<string, unknown>) => {
            const current = (field.value as ToolProviderOverrides | undefined) ?? {};
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
              [key]: getToolOverrideFieldDefaultValue(providerId, key, fieldSchemas),
            };
            setDraft(formatOverrideJson(next));
            writeProviderOverride(next);
          };

          return (
            <>
              <SectionHeader
                label="Override fields"
                tooltip={
                  isWebhook
                    ? 'Webhook overrides replace default content and accept arbitrary JSON object keys.'
                    : `These fields merge over your default content. "${primaryKey}" falls back to the default message unless set here. Supports Liquid variables inside string values.`
                }
                rightSlot={
                  <ToolOverrideSupportedFields
                    providerId={providerId}
                    fieldSchemas={fieldSchemas}
                    usedKeys={usedDraftKeys}
                    canInsert={!parseError}
                    onInsertField={handleInsertField}
                  />
                }
              />
              <InputRoot className="min-h-[180px]" hasError={!!parseError}>
                <ControlInput
                  size="2xs"
                  multiline={true}
                  indentWithTab={true}
                  placeholder={
                    isWebhook ? '{\n  "event": "{{payload.title}}"\n}' : `{\n  "${primaryKey}": "{{payload.title}}"\n}`
                  }
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
              <div className="text-text-soft flex items-start gap-1 px-1 py-0.5">
                <RiLightbulbLine className="mt-0.5 size-3 shrink-0" />
                {isWebhook ? (
                  <span className="text-xs">
                    Non-empty JSON replaces default content and is sent to every active webhook integration. Each
                    integration merges its own body template beneath this payload. Empty <code>{'{}'}</code> uses
                    default content.
                    {ignoredSchemaSources.length > 0 && (
                      <>
                        {' '}
                        Autocomplete is unavailable for:{' '}
                        {ignoredSchemaSources.map(formatWebhookSchemaSourceLabel).join(', ')}.
                      </>
                    )}
                  </span>
                ) : (
                  <span className="text-xs">
                    Fields merge over default content. <code className="text-[11px]">{primaryKey}</code> falls back to
                    your default message unless set here.
                  </span>
                )}
              </div>
            </>
          );
        }}
      />
    </div>
  );
}
