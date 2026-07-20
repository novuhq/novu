import { ContentIssueEnum, getToolProviderOverrideSchema, type ToolContentOverrideProviderId } from '@novu/shared';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
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
import { getProviderPrimaryContentKey, type ToolProviderOverrides } from './tool-content-source';

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
  onValidityChange?: (providerId: ToolContentOverrideProviderId, isValid: boolean) => void;
};

export function ToolProviderOverrideEditor({ providerId, onValidityChange }: ToolProviderOverrideEditorProps) {
  const { control, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const schema = getToolProviderOverrideSchema(providerId);
  const primaryKey = getProviderPrimaryContentKey(providerId);
  const allowedKeys = useMemo(() => new Set(Object.keys(schema?.properties ?? {})), [schema]);

  const [draft, setDraft] = useState(() =>
    formatOverrideJson((getValues(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined)?.[providerId])
  );

  useEffect(() => {
    setDraft(
      formatOverrideJson((getValues(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined)?.[providerId])
    );
  }, [getValues, providerId]);

  const ajvValidate = useMemo(() => {
    if (!schema) {
      return null;
    }

    const ajv = new Ajv({ allErrors: true, verbose: true, strict: false, strictSchema: false });
    addFormats(ajv);

    try {
      return ajv.compile(schema);
    } catch {
      return null;
    }
  }, [schema]);

  const { parseError, parsedDraft, schemaWarnings } = useMemo(() => {
    const { parsed, error } = parseOverrideJson(draft);
    if (error || !parsed) {
      return { parseError: error, parsedDraft: undefined, schemaWarnings: [] as string[] };
    }

    if (!ajvValidate) {
      return { parseError: undefined, parsedDraft: parsed, schemaWarnings: [] as string[] };
    }

    const isValid = ajvValidate(parsed);
    if (isValid) {
      return { parseError: undefined, parsedDraft: parsed, schemaWarnings: [] as string[] };
    }

    // Unknown keys are owned by the unsupported-property path below; keep only value-shape warnings here.
    const warnings =
      ajvValidate.errors
        ?.filter((ajvError) => ajvError.keyword !== 'additionalProperties')
        .map((ajvError) => {
          const path = ajvError.instancePath ? `${ajvError.instancePath}: ` : '';

          return `${path}${ajvError.message}`;
        }) ?? [];

    return { parseError: undefined, parsedDraft: parsed, schemaWarnings: warnings };
  }, [ajvValidate, draft]);

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

      const relativePath = issuePath.slice(prefix.length + 1);
      const topKey = relativePath.split('.')[0];

      return Object.hasOwn(parsedDraft, topKey);
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

    return Object.keys(parsedDraft)
      .filter((key) => !allowedKeys.has(key) && !serverCoveredKeys.has(key))
      .map((key) => `"${key}" is not a supported property`);
  }, [parsedDraft, allowedKeys, activeServerIssues, providerId]);

  useEffect(() => {
    onValidityChange?.(providerId, !parseError);
  }, [onValidityChange, parseError, providerId]);

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader
        label="Request body"
        tooltip={`These fields merge over your default content. "${primaryKey}" falls back to the default message unless set here. Supports Liquid variables inside string values.`}
        rightSlot={
          <div className="flex items-center gap-1.5">
            <Badge variant="lighter" color="gray" size="sm">
              OVERRIDDEN
            </Badge>
            <Badge variant="lighter" color="gray" size="sm">
              {'{ }'} JSON
            </Badge>
          </div>
        }
      />
      <Controller
        control={control}
        name={PROVIDER_OVERRIDES_FIELD}
        render={({ field }) => (
          <>
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

                  const current = (field.value as ToolProviderOverrides | undefined) ?? {};
                  field.onChange({
                    ...current,
                    [providerId]: parsed,
                  });
                  saveForm();
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
                {schemaWarnings.length > 0 && (
                  <div className="flex items-start gap-1 px-1">
                    <RiErrorWarningLine className="text-warning mt-0.5 h-3 w-3 shrink-0" />
                    <span className="text-warning text-xs">{schemaWarnings[0]}</span>
                  </div>
                )}
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
        )}
      />
    </div>
  );
}
