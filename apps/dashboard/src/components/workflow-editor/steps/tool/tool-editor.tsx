import { ChannelTypeEnum, EnvironmentTypeEnum, TOOL_CONTENT_OVERRIDE_PROVIDER_IDS, type UiSchema } from '@novu/shared';
import { useCallback, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { getComponentByType } from '@/components/workflow-editor/steps/component-utils';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
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

export const ToolEditor = (props: ToolEditorProps) => {
  const { currentEnvironment } = useEnvironment();
  const { uiSchema } = props;
  const { body } = uiSchema?.properties ?? {};
  const { integrations } = useFetchIntegrations();
  const { watch, setValue, getValues } = useFormContext();
  const { saveForm } = useSaveForm();

  const providerOverrides = watch(PROVIDER_OVERRIDES_FIELD) as ToolProviderOverrides | undefined;
  const { selectedSource, setSelectedSource } = useToolContentSource();
  const [invalidProviderIds, setInvalidProviderIds] = useState<Set<string>>(new Set());

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
    [getValues, saveForm, setValue]
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
    [getValues, saveForm, selectedSource, setValue]
  );

  if (currentEnvironment?.type !== EnvironmentTypeEnum.DEV) {
    return <StepEditorUnavailable />;
  }

  const showingOverride =
    selectedSource !== DEFAULT_CONTENT_SOURCE &&
    isToolContentOverrideProviderId(selectedSource) &&
    selectedSource in (providerOverrides ?? {});

  return (
    <div className="flex h-full flex-col">
      <TabsSection className="p-0 pb-3">
        <div className="rounded-12 flex flex-col gap-2 border border-neutral-100 bg-bg-weak p-2">
          <div className="flex items-center justify-between px-0.5">
            <ToolContentSourceSelector
              selectedSource={showingOverride ? selectedSource : DEFAULT_CONTENT_SOURCE}
              providers={providerOptions}
              invalidProviderIds={invalidProviderIds}
              onSelectSource={setSelectedSource}
              onAddOverride={handleAddOverride}
              onRemoveOverride={handleRemoveOverride}
            />
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
