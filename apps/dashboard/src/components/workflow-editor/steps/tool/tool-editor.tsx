import {
  ChannelTypeEnum,
  EnvironmentTypeEnum,
  getToolProviderOverrideSchema,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  type UiSchema,
} from '@novu/shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiErrorWarningFill } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { StepEditorUnavailable } from '../step-editor-unavailable';
import {
  buildToolOverrideProviderOptions,
  DEFAULT_CONTENT_SOURCE,
  isToolContentOverrideProviderId,
  type ToolProviderOverrides,
} from './tool-content-source';
import { useToolContentSource } from './tool-content-source-context';
import { ToolContentSourceSelector } from './tool-content-source-selector';
import { ToolProviderOverrideEditor } from './tool-provider-override-editor';

type ToolEditorProps = { uiSchema: UiSchema };

const PROVIDER_OVERRIDES_FIELD = 'providerOverrides';

function getProvidersWithUnsupportedKeys(providerOverrides: ToolProviderOverrides | undefined): Set<string> {
  const invalid = new Set<string>();

  for (const [providerId, override] of Object.entries(providerOverrides ?? {})) {
    if (!isToolContentOverrideProviderId(providerId)) {
      continue;
    }

    const schema = getToolProviderOverrideSchema(providerId);
    if (!schema) {
      continue;
    }

    const allowedKeys = new Set(Object.keys(schema.properties ?? {}));
    const hasUnsupportedKey = Object.keys(override ?? {}).some((key) => !allowedKeys.has(key));
    if (hasUnsupportedKey) {
      invalid.add(providerId);
    }
  }

  return invalid;
}

export const ToolEditor = (props: ToolEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};
  const { integrations } = useFetchIntegrations();
  const { watch, setValue, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step } = useWorkflow();

  const providerOverrides = watch(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined;
  const { selectedSource, setSelectedSource } = useToolContentSource();
  const [invalidProviderIds, setInvalidProviderIds] = useState<Set<string>>(new Set());

  // Reset to default when the selected override no longer exists (e.g. dropped by a
  // form reset) so the editor and the mirrored preview stay in sync — the preview
  // reads the same context state, so masking it only at render time would diverge.
  useEffect(() => {
    if (selectedSource !== DEFAULT_CONTENT_SOURCE && !(selectedSource in (providerOverrides ?? {}))) {
      setSelectedSource(DEFAULT_CONTENT_SOURCE);
    }
  }, [selectedSource, providerOverrides, setSelectedSource]);

  const activeProviderIds = useMemo(() => {
    const ids = new Set<string>();

    for (const integration of integrations ?? []) {
      if (
        integration.active &&
        !integration.deleted &&
        integration.channel === ChannelTypeEnum.TOOL &&
        integration._environmentId === currentEnvironment?._id &&
        isToolContentOverrideProviderId(integration.providerId)
      ) {
        ids.add(integration.providerId);
      }
    }

    return ids;
  }, [integrations, currentEnvironment?._id]);

  const providerOptions = useMemo(
    () =>
      buildToolOverrideProviderOptions({
        activeProviderIds,
        providerOverrides,
      }),
    [activeProviderIds, providerOverrides]
  );

  // Server issues are keyed as `providerOverrides.{providerId}` or `providerOverrides.{providerId}.{key}`,
  // so they cover every provider regardless of which override editor is currently mounted.
  const serverIssueCountByProvider = useMemo(() => {
    const counts = new Map<string, number>();
    const controlIssues = step?.issues?.controls ?? {};
    const prefix = `${PROVIDER_OVERRIDES_FIELD}.`;

    for (const [key, issueList] of Object.entries(controlIssues)) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      const providerId = key.slice(prefix.length).split('.')[0];
      counts.set(providerId, (counts.get(providerId) ?? 0) + issueList.length);
    }

    return counts;
  }, [step?.issues?.controls]);

  // Persist unsupported-key errors from form values so they remain visible when the
  // override editor unmounts (switching back to Default content clears local draft flags).
  const persistedInvalidProviderIds = useMemo(
    () => getProvidersWithUnsupportedKeys(providerOverrides),
    [providerOverrides]
  );

  const providersWithErrors = useMemo(() => {
    const merged = new Set([...invalidProviderIds, ...persistedInvalidProviderIds]);

    for (const [providerId, count] of serverIssueCountByProvider) {
      if (count > 0) {
        merged.add(providerId);
      }
    }

    return merged;
  }, [invalidProviderIds, persistedInvalidProviderIds, serverIssueCountByProvider]);

  const totalErrorCount = useMemo(() => {
    let total = 0;

    for (const count of serverIssueCountByProvider.values()) {
      total += count;
    }

    // Client-only problems (unsaved draft parse errors, unsupported keys before server
    // issues catch up) aren't always reflected in step.issues yet — count each such
    // provider as one issue.
    for (const providerId of providersWithErrors) {
      if (!serverIssueCountByProvider.get(providerId)) {
        total += 1;
      }
    }

    return total;
  }, [serverIssueCountByProvider, providersWithErrors]);

  const handleValidityChange = useCallback((providerId: string, isValid: boolean) => {
    setInvalidProviderIds((prev) => {
      const next = new Set(prev);
      if (isValid) {
        next.delete(providerId);
      } else {
        next.add(providerId);
      }

      return next;
    });
  }, []);

  const handleAddOverride = useCallback(
    (providerId: (typeof TOOL_CONTENT_OVERRIDE_PROVIDER_IDS)[number]) => {
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
    (providerId: (typeof TOOL_CONTENT_OVERRIDE_PROVIDER_IDS)[number]) => {
      const current = (getValues(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined) ?? {};
      if (!(providerId in current)) {
        return;
      }

      const next = { ...current };
      delete next[providerId];

      const cleaned = Object.keys(next).length > 0 ? next : undefined;
      setValue(PROVIDER_OVERRIDES_FIELD, cleaned, { shouldDirty: true });
      setInvalidProviderIds((prev) => {
        const updated = new Set(prev);
        updated.delete(providerId);

        return updated;
      });

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

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const showingOverride = selectedSource !== DEFAULT_CONTENT_SOURCE && selectedSource in (providerOverrides ?? {});

  return (
    <div className="flex h-full flex-col">
      <TabsSection className="p-0 pb-3">
        <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 bg-bg-weak p-2">
          <div className="flex items-center gap-1 px-0.5">
            <ToolContentSourceSelector
              selectedSource={showingOverride ? selectedSource : DEFAULT_CONTENT_SOURCE}
              providers={providerOptions}
              invalidProviderIds={providersWithErrors}
              onSelectSource={setSelectedSource}
              onAddOverride={handleAddOverride}
              onRemoveOverride={handleRemoveOverride}
            />
            {totalErrorCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={`${totalErrorCount} ${totalErrorCount === 1 ? 'issue' : 'issues'} in provider overrides`}
                    className="hover:bg-neutral-alpha-50 flex h-7 items-center gap-1 rounded-md px-1.5"
                    onClick={handleJumpToFirstError}
                  >
                    <span className="text-destructive text-xs font-medium tabular-nums">{totalErrorCount}</span>
                    <RiErrorWarningFill className="text-destructive size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {totalErrorCount === 1 ? '1 issue' : `${totalErrorCount} issues`} in provider overrides
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {showingOverride ? (
            <ToolProviderOverrideEditor providerId={selectedSource} onValidityChange={handleValidityChange} />
          ) : (
            body && getComponentByType({ component: body.component })
          )}
        </div>
      </TabsSection>
    </div>
  );
};
