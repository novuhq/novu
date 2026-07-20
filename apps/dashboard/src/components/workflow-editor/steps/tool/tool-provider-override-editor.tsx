import { ContentIssueEnum, getToolProviderPrimaryContentKey, type ToolContentOverrideProviderId } from '@novu/shared';
import { useEffect, useMemo, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { RiErrorWarningLine, RiLightbulbLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { InputRoot } from '@/components/primitives/input';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { SectionHeader } from '@/components/workflow-editor/steps/http-request/section-header';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { getUnsupportedToolOverrideKeys, type ToolProviderOverrides } from './tool-content-source';
import { getToolOverrideFieldDefaultValue, ToolOverrideSupportedFields } from './tool-override-supported-fields';

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

    return { parsed };
  } catch {
    return { error: 'Invalid JSON syntax' };
  }
}

type ToolProviderOverrideEditorProps = {
  providerId: ToolContentOverrideProviderId;
  onDraftParseValidityChange?: (providerId: ToolContentOverrideProviderId, isParseValid: boolean) => void;
};

export function ToolProviderOverrideEditor({
  providerId,
  onDraftParseValidityChange,
}: ToolProviderOverrideEditorProps) {
  const { control, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const primaryKey = getToolProviderPrimaryContentKey(providerId);

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

  const activeServerIssues = useMemo(() => {
    const controlIssues = step?.issues?.controls ?? {};
    const prefix = `${PROVIDER_OVERRIDES_FIELD}.${providerId}`;

    const issues = Object.entries(controlIssues)
      .filter(([key]) => key === prefix || key.startsWith(`${prefix}.`))
      .flatMap(([path, issueList]) => issueList.map((issue) => ({ ...issue, path })));

    if (!parsedDraft) {
      return issues;
    }

    return issues.filter((issue) => {
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

    const serverCoveredKeys = new Set(
      activeServerIssues
        .filter((issue) => issue.issueType === ContentIssueEnum.UNSUPPORTED_PROPERTY)
        .map((issue) => {
          const issuePath = issue.variableName ?? issue.path;
          const prefix = `${PROVIDER_OVERRIDES_FIELD}.${providerId}.`;

          return issuePath.startsWith(prefix) ? issuePath.slice(prefix.length).split('.')[0] : undefined;
        })
        .filter((key): key is string => !!key)
    );

    return getUnsupportedToolOverrideKeys(providerId, parsedDraft)
      .filter((key) => !serverCoveredKeys.has(key))
      .map((key) => `"${key}" is not a supported property`);
  }, [parsedDraft, activeServerIssues, providerId]);

  const usedDraftKeys = useMemo(() => new Set(Object.keys(parsedDraft ?? {})), [parsedDraft]);

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

            const next = { ...parsedDraft, [key]: getToolOverrideFieldDefaultValue(providerId, key) };
            setDraft(formatOverrideJson(next));
            writeProviderOverride(next);
          };

          return (
            <>
              <SectionHeader
                label="Override fields"
                tooltip={`These fields merge over your default content. "${primaryKey}" falls back to the default message unless set here. Supports Liquid variables inside string values.`}
                rightSlot={
                  <div className="flex items-center gap-1.5">
                    <ToolOverrideSupportedFields
                      providerId={providerId}
                      usedKeys={usedDraftKeys}
                      canInsert={!parseError}
                      onInsertField={handleInsertField}
                    />
                    <Badge variant="lighter" color="gray" size="sm">
                      OVERRIDDEN
                    </Badge>
                    <Badge variant="lighter" color="gray" size="sm">
                      {'{ }'} JSON
                    </Badge>
                  </div>
                }
              />
              <InputRoot className="min-h-[180px]" hasError={!!parseError}>
                <ControlInput
                  size="2xs"
                  multiline={true}
                  indentWithTab={true}
                  placeholder={`{\n  "${primaryKey}": "{{payload.title}}"\n}`}
                  value={draft}
                  isAllowedVariable={isAllowedVariable}
                  variables={variables}
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
                  <div className="text-text-soft flex items-start gap-1 px-1 py-0.5">
                    <RiLightbulbLine className="mt-0.5 size-3 shrink-0" />
                    <span className="text-xs">
                      Fields merge over default content. <code className="text-[11px]">{primaryKey}</code> falls back to
                      your default message unless set here.
                    </span>
                  </div>
                </>
              )}
            </>
          );
        }}
      />
    </div>
  );
}
