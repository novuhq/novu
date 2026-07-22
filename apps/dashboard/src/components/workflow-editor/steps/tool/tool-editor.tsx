import { ContentIssueEnum, EnvironmentTypeEnum, type UiSchema } from '@novu/shared';
import { Undo2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiErrorWarningFill } from 'react-icons/ri';
import { ConfirmationModal } from '@/components/confirmation-modal';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import {
  type DashboardToolContentOverrideProviderId,
  DEFAULT_CONTENT_SOURCE,
  getContentSourceLabel,
  getUnsupportedToolOverrideKeys,
  isToolContentOverrideProviderId,
  type ToolProviderOverrides,
  WEBHOOK_TOOL_PROVIDER_ID,
} from './tool-content-source';
import { useToolContentSource } from './tool-content-source-context';
import { ToolContentSourceSelector } from './tool-content-source-selector';
import { ToolProviderOverrideEditor } from './tool-provider-override-editor';
import { useToolOverrideProviderOptions } from './use-tool-override-provider-options';

type ToolEditorProps = { uiSchema: UiSchema };

const PROVIDER_OVERRIDES_FIELD = 'providerOverrides';

export const ToolEditor = (props: ToolEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};
  const { setValue, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step } = useWorkflow();
  const { providerOptions, providerOverrides, webhookPayloadSchema } = useToolOverrideProviderOptions();

  const { selectedSource, setSelectedSource } = useToolContentSource();
  // Only one override editor is mounted at a time, so at most one provider can have an uncommitted parse error.
  const [draftParseErrorProviderId, setDraftParseErrorProviderId] = useState<string | null>(null);
  const [pendingResetProviderId, setPendingResetProviderId] = useState<DashboardToolContentOverrideProviderId | null>(
    null
  );

  useEffect(() => {
    if (selectedSource !== DEFAULT_CONTENT_SOURCE && !(selectedSource in (providerOverrides ?? {}))) {
      setSelectedSource(DEFAULT_CONTENT_SOURCE);
    }
  }, [selectedSource, providerOverrides, setSelectedSource]);

  const unsupportedKeyCountByProvider = useMemo(() => {
    const counts = new Map<string, number>();

    for (const [providerId, override] of Object.entries(providerOverrides ?? {})) {
      if (!isToolContentOverrideProviderId(providerId)) {
        continue;
      }

      const unsupportedCount = getUnsupportedToolOverrideKeys(providerId, override).length;
      if (unsupportedCount > 0) {
        counts.set(providerId, unsupportedCount);
      }
    }

    return counts;
  }, [providerOverrides]);

  const otherServerIssueCountByProvider = useMemo(() => {
    const counts = new Map<string, number>();
    const controlIssues = step?.issues?.controls ?? {};
    const prefix = `${PROVIDER_OVERRIDES_FIELD}.`;

    for (const [key, issueList] of Object.entries(controlIssues)) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      const providerId = key.slice(prefix.length).split('.')[0];
      const otherCount = issueList.filter((issue) => issue.issueType !== ContentIssueEnum.UNSUPPORTED_PROPERTY).length;
      if (otherCount > 0) {
        counts.set(providerId, (counts.get(providerId) ?? 0) + otherCount);
      }
    }

    return counts;
  }, [step?.issues?.controls]);

  const providersWithErrors = useMemo(() => {
    const merged = new Set([...unsupportedKeyCountByProvider.keys(), ...otherServerIssueCountByProvider.keys()]);

    if (draftParseErrorProviderId) {
      merged.add(draftParseErrorProviderId);
    }

    return merged;
  }, [draftParseErrorProviderId, unsupportedKeyCountByProvider, otherServerIssueCountByProvider]);

  const totalErrorCount = useMemo(() => {
    let total = draftParseErrorProviderId ? 1 : 0;

    for (const unsupportedCount of unsupportedKeyCountByProvider.values()) {
      total += unsupportedCount;
    }

    for (const otherCount of otherServerIssueCountByProvider.values()) {
      total += otherCount;
    }

    return total;
  }, [otherServerIssueCountByProvider, unsupportedKeyCountByProvider, draftParseErrorProviderId]);

  const handleDraftParseValidityChange = useCallback((providerId: string, isParseValid: boolean) => {
    setDraftParseErrorProviderId(isParseValid ? null : providerId);
  }, []);

  const handleAddOverride = useCallback(
    (providerId: DashboardToolContentOverrideProviderId) => {
      const current = (getValues(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined) ?? {};
      if (providerId in current) {
        setSelectedSource(providerId);

        return;
      }

      const next = {
        ...current,
        [providerId]: {},
      };
      setValue(PROVIDER_OVERRIDES_FIELD, next, { shouldDirty: true });
      setSelectedSource(providerId);
      saveForm();
    },
    [getValues, saveForm, setValue, setSelectedSource]
  );

  const handleRemoveOverride = useCallback(
    (providerId: DashboardToolContentOverrideProviderId) => {
      const current = (getValues(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined) ?? {};
      if (!(providerId in current)) {
        return;
      }

      const next = { ...current };
      delete next[providerId];

      // null = delete-all contract; undefined would be omitted and leave STEP_PROVIDER_CONTROLS docs intact.
      const cleaned = Object.keys(next).length > 0 ? next : null;
      setValue(PROVIDER_OVERRIDES_FIELD, cleaned, { shouldDirty: true });
      setDraftParseErrorProviderId(null);

      if (selectedSource === providerId) {
        setSelectedSource(DEFAULT_CONTENT_SOURCE);
      }

      saveForm();
    },
    [getValues, saveForm, selectedSource, setValue, setSelectedSource]
  );

  const handleJumpToFirstError = useCallback(() => {
    const firstProviderWithError = providerOptions.find(
      (option) => option.hasOverride && providersWithErrors.has(option.providerId)
    );

    if (firstProviderWithError) {
      setSelectedSource(firstProviderWithError.providerId);
    }
  }, [providerOptions, providersWithErrors, setSelectedSource]);

  const handleConfirmReset = useCallback(() => {
    if (pendingResetProviderId) {
      handleRemoveOverride(pendingResetProviderId);
    }

    setPendingResetProviderId(null);
  }, [handleRemoveOverride, pendingResetProviderId]);

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const showingOverride = selectedSource !== DEFAULT_CONTENT_SOURCE && selectedSource in (providerOverrides ?? {});

  return (
    <div className="-mx-3 -mt-3 flex h-full flex-col">
      <div className="border-stroke-soft bg-bg-weak flex h-7 shrink-0 items-center border-b">
        <ToolContentSourceSelector
          selectedSource={showingOverride ? selectedSource : DEFAULT_CONTENT_SOURCE}
          providers={providerOptions}
          invalidProviderIds={providersWithErrors}
          onSelectSource={setSelectedSource}
          onAddOverride={handleAddOverride}
        />
        {totalErrorCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={`${totalErrorCount} ${totalErrorCount === 1 ? 'issue' : 'issues'} in provider overrides`}
                className="border-stroke-soft bg-bg-white hover:bg-bg-weak flex h-7 items-center gap-px border-r pl-1.5 pr-[5px] transition-colors"
                onClick={handleJumpToFirstError}
              >
                <span className="text-code-xs text-error-base tabular-nums">{totalErrorCount}</span>
                <RiErrorWarningFill className="text-error-base size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {totalErrorCount === 1 ? '1 issue' : `${totalErrorCount} issues`} in provider overrides
            </TooltipContent>
          </Tooltip>
        )}
        {showingOverride && (
          <button
            type="button"
            className="border-stroke-soft bg-bg-white text-label-xs text-text-strong hover:bg-bg-weak flex h-7 items-center gap-1 border-r pl-1.5 pr-2 transition-colors"
            onClick={() => setPendingResetProviderId(selectedSource)}
          >
            <Undo2 className="size-3.5" />
            <span>Reset to default</span>
          </button>
        )}
        <div className="h-full flex-1" />
      </div>

      <TabsSection className="p-3">
        {showingOverride ? (
          <ToolProviderOverrideEditor
            providerId={selectedSource}
            fieldSchemas={selectedSource === WEBHOOK_TOOL_PROVIDER_ID ? webhookPayloadSchema.properties : undefined}
            onDraftParseValidityChange={handleDraftParseValidityChange}
          />
        ) : (
          body && (
            <div className="rounded-12 bg-bg-weak flex flex-col gap-2 border border-neutral-100 p-2">
              {getComponentByType({ component: body.component })}
            </div>
          )
        )}
      </TabsSection>

      <ConfirmationModal
        open={pendingResetProviderId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingResetProviderId(null);
          }
        }}
        onConfirm={handleConfirmReset}
        title="Reset to default content?"
        description={
          <>
            This will remove the {pendingResetProviderId ? getContentSourceLabel(pendingResetProviderId) : 'provider'}{' '}
            override and restore the default content for this step. This action cannot be undone.
          </>
        }
        confirmButtonText="Reset to default"
        confirmButtonVariant="error"
      />
    </div>
  );
};
