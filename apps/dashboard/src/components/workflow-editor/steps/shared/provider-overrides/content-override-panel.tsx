import { Undo2 } from 'lucide-react';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { RiErrorWarningFill } from 'react-icons/ri';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { TabsSection } from '@/components/workflow-editor/steps/tabs-section';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import {
  ALL_INTEGRATIONS_LABEL,
  DEFAULT_CONTENT_SOURCE,
  getIntegrationName,
  getOverrideFormField,
  getOverrideIssueOwnerPath,
  getOverridePath,
  getOverrideProviderDisplayName,
  getSourceOverride,
  getUnsupportedOverrideKeys,
  isSameContentSource,
  listSourceOverrides,
  type OverrideChannel,
  type OverrideContentSource,
  type OverrideValues,
  type ProviderOverrideOption,
  shouldKeepServerOverrideIssue,
  toOverrideSource,
  updateSourceOverride,
} from './content-source';
import { useContentSource } from './content-source-context';
import { ContentSourceSelector } from './content-source-selector';
import {
  MergesOverBar,
  type OverrideInheritance,
  ProviderOverrideEditor,
  type ProviderOverrideEditorProps,
} from './provider-override-editor';
import { RemoveOverrideModal } from './remove-override-modal';
import { readOverrideValues } from './use-provider-override-options';

/** What an override starts from before its own keys apply, and which integrations replace its keys. */
function buildOverrideInheritance(
  source: OverrideContentSource,
  providerOptions: ProviderOverrideOption[],
  overrides: OverrideValues
): OverrideInheritance {
  const { providerId, integrationIdentifier } = source;
  const providerOption = providerOptions.find((option) => option.providerId === providerId);
  const providerName = providerOption?.displayName ?? getOverrideProviderDisplayName(providerId);
  const hasIntegrations = !!providerOption && providerOption.integrations.length > 0;
  const allIntegrationsLabel = `${providerName} · ${ALL_INTEGRATIONS_LABEL}`;
  const defaultContentLayer = { label: 'Default content', source: DEFAULT_CONTENT_SOURCE };

  if (integrationIdentifier !== undefined) {
    const providerOverride = getSourceOverride({ providerId }, overrides);
    const hasInheritedKeys = Object.keys(providerOverride ?? {}).length > 0;
    const inheritsFrom = providerOverride === undefined ? 'Default content' : ALL_INTEGRATIONS_LABEL;

    return {
      emptyMessage: `${getIntegrationName(providerId, integrationIdentifier, providerOptions)} inherits everything from ${inheritsFrom}. Add only the keys that should differ.`,
      inheritedOverride: hasInheritedKeys ? providerOverride : undefined,
      overriddenKeyLabels: {},
      mergesOver:
        providerOverride === undefined
          ? [defaultContentLayer]
          : [defaultContentLayer, { label: allIntegrationsLabel, source: { providerId } }],
      ownerLabel: getIntegrationName(providerId, integrationIdentifier, providerOptions),
      ownerIdentifier: integrationIdentifier,
    };
  }

  const integrationNamesByKey = new Map<string, string[]>();

  for (const [identifier, integrationOverride] of Object.entries(overrides.integrationOverrides?.[providerId] ?? {})) {
    const integrationName = getIntegrationName(providerId, identifier, providerOptions);

    for (const key of Object.keys(integrationOverride ?? {})) {
      integrationNamesByKey.set(key, [...(integrationNamesByKey.get(key) ?? []), integrationName]);
    }
  }

  const owner = hasIntegrations ? `All ${providerName} integrations inherit` : `${providerName} inherits`;

  return {
    emptyMessage: `${owner} everything from Default content. Add only the keys that should differ.`,
    overriddenKeyLabels: Object.fromEntries(
      [...integrationNamesByKey].map(([key, names]) => [
        key,
        names.length === 1 ? `Overridden in ${names[0]}` : `Overridden in ${names.length} integrations`,
      ])
    ),
    mergesOver: [defaultContentLayer],
    ownerLabel: hasIntegrations ? allIntegrationsLabel : providerName,
    ownerIdentifier: providerOption?.soleIntegrationIdentifier,
  };
}

/** Per-provider customizations a channel can layer onto the generic override editor. */
export type ProviderOverrideEditorExtras = Pick<
  ProviderOverrideEditorProps,
  'notice' | 'headerTooltip' | 'placeholder' | 'rootSchemaOverride' | 'describeField' | 'annotateField'
>;

type ContentOverridePanelProps = {
  channel: OverrideChannel;
  providerOptions: ProviderOverrideOption[];
  overrides: OverrideValues;
  defaultContent: ReactNode;
  /**
   * Rendered at the top-right inside the TabsSection when showing default content
   * (e.g. Block/Text editor toggle). Hidden while a provider override is selected.
   */
  defaultContentActions?: ReactNode;
  showEscapeHatchBadge?: boolean;
  getEditorExtras?: (source: OverrideContentSource) => ProviderOverrideEditorExtras;
};

export function ContentOverridePanel({
  channel,
  providerOptions,
  overrides,
  defaultContent,
  defaultContentActions,
  showEscapeHatchBadge,
  getEditorExtras,
}: ContentOverridePanelProps) {
  const { setValue, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step } = useWorkflow();
  const { selectedSource, setSelectedSource } = useContentSource();
  const { isReadOnly } = useStepEditor();
  // Only one override editor is mounted at a time, so at most one override can have an uncommitted parse error.
  const [draftParseErrorPath, setDraftParseErrorPath] = useState<string | null>(null);
  const [pendingResetSource, setPendingResetSource] = useState<OverrideContentSource | null>(null);

  const overrideSource =
    selectedSource !== DEFAULT_CONTENT_SOURCE && getSourceOverride(selectedSource, overrides) !== undefined
      ? selectedSource
      : undefined;

  useEffect(() => {
    if (selectedSource !== DEFAULT_CONTENT_SOURCE && !overrideSource) {
      setSelectedSource(DEFAULT_CONTENT_SOURCE);
    }
  }, [selectedSource, overrideSource, setSelectedSource]);

  const sourceOverrides = useMemo(() => listSourceOverrides(channel, overrides), [channel, overrides]);

  const overrideInheritance = useMemo(
    () => (overrideSource ? buildOverrideInheritance(overrideSource, providerOptions, overrides) : undefined),
    [overrideSource, providerOptions, overrides]
  );

  const unsupportedKeyCountByPath = useMemo(() => {
    const counts = new Map<string, number>();

    for (const { source, override } of sourceOverrides) {
      const unsupportedCount = getUnsupportedOverrideKeys(source.providerId, override).length;
      if (unsupportedCount > 0) {
        counts.set(getOverridePath(source), unsupportedCount);
      }
    }

    return counts;
  }, [sourceOverrides]);

  const otherServerIssueCountByPath = useMemo(() => {
    const counts = new Map<string, number>();
    const controlIssues = step?.issues?.controls ?? {};
    const integrationOverridePaths = sourceOverrides
      .filter(({ source }) => source.integrationIdentifier !== undefined)
      .map(({ source }) => getOverridePath(source));

    for (const [key, issueList] of Object.entries(controlIssues)) {
      const ownerPath = getOverrideIssueOwnerPath(key, integrationOverridePaths);
      if (!ownerPath) {
        continue;
      }

      // Mirror the editor: top-level UNSUPPORTED_PROPERTY is counted via
      // getUnsupportedOverrideKeys; nested ones only exist on the server issues.
      const otherCount = issueList.filter((issue) => shouldKeepServerOverrideIssue(issue, key, ownerPath)).length;
      if (otherCount > 0) {
        counts.set(ownerPath, (counts.get(ownerPath) ?? 0) + otherCount);
      }
    }

    return counts;
  }, [sourceOverrides, step?.issues?.controls]);

  const sourcePathsWithErrors = useMemo(() => {
    const merged = new Set([...unsupportedKeyCountByPath.keys(), ...otherServerIssueCountByPath.keys()]);

    if (draftParseErrorPath) {
      merged.add(draftParseErrorPath);
    }

    return merged;
  }, [draftParseErrorPath, unsupportedKeyCountByPath, otherServerIssueCountByPath]);

  const totalErrorCount = useMemo(() => {
    let total = draftParseErrorPath ? 1 : 0;

    for (const unsupportedCount of unsupportedKeyCountByPath.values()) {
      total += unsupportedCount;
    }

    for (const otherCount of otherServerIssueCountByPath.values()) {
      total += otherCount;
    }

    return total;
  }, [otherServerIssueCountByPath, unsupportedKeyCountByPath, draftParseErrorPath]);

  const handleDraftParseValidityChange = useCallback((overridePath: string, isParseValid: boolean) => {
    setDraftParseErrorPath(isParseValid ? null : overridePath);
  }, []);

  const handleAddOverride = useCallback(
    (source: OverrideContentSource) => {
      const current = readOverrideValues(getValues);
      if (getSourceOverride(source, current) === undefined) {
        setValue(getOverrideFormField(source), updateSourceOverride(source, current, {}), { shouldDirty: true });
        saveForm();
      }

      setSelectedSource(source);
    },
    [getValues, saveForm, setValue, setSelectedSource]
  );

  const handleRemoveOverride = useCallback(
    (source: OverrideContentSource) => {
      const current = readOverrideValues(getValues);
      if (getSourceOverride(source, current) === undefined) {
        return;
      }

      setValue(getOverrideFormField(source), updateSourceOverride(source, current, undefined), { shouldDirty: true });
      setDraftParseErrorPath(null);

      if (isSameContentSource(selectedSource, source)) {
        setSelectedSource(DEFAULT_CONTENT_SOURCE);
      }

      saveForm();
    },
    [getValues, saveForm, selectedSource, setValue, setSelectedSource]
  );

  const handleJumpToFirstError = useCallback(() => {
    const firstOptionWithError = providerOptions
      .flatMap((option) => [option, ...option.integrations])
      .find((option) => option.hasOverride && sourcePathsWithErrors.has(getOverridePath(option)));

    if (firstOptionWithError) {
      setSelectedSource(toOverrideSource(firstOptionWithError));
    }
  }, [providerOptions, sourcePathsWithErrors, setSelectedSource]);

  const handleConfirmReset = useCallback(() => {
    if (pendingResetSource) {
      handleRemoveOverride(pendingResetSource);
    }

    setPendingResetSource(null);
  }, [handleRemoveOverride, pendingResetSource]);

  return (
    <div className="-mx-3 -mt-3 flex h-full min-h-0 flex-col">
      <div className="border-stroke-soft bg-bg-weak flex h-7 shrink-0 items-center border-b">
        <ContentSourceSelector
          selectedSource={overrideSource ?? DEFAULT_CONTENT_SOURCE}
          providers={providerOptions}
          invalidSourcePaths={sourcePathsWithErrors}
          showEscapeHatchBadge={showEscapeHatchBadge}
          overrideCount={sourceOverrides.length}
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
        {overrideSource && (
          <button
            type="button"
            className="border-stroke-soft bg-bg-white text-label-xs text-text-strong hover:bg-bg-weak flex h-7 items-center gap-1 border-r pl-1.5 pr-2 transition-colors disabled:opacity-50"
            onClick={() => setPendingResetSource(overrideSource)}
            disabled={isReadOnly}
          >
            <Undo2 className="size-3.5" />
            <span>Remove override</span>
          </button>
        )}
        <div className="h-full flex-1" />
      </div>

      <TabsSection className="flex min-h-0 flex-1 flex-col gap-0 p-3">
        <MergesOverBar inheritance={overrideInheritance} onSelectSource={setSelectedSource} />
        {overrideSource ? (
          // Keyed per source: the editor's Controller binds `providerOverrides` or `integrationOverrides`,
          // and react-hook-form unregisters (drops the value of) a Controller's previous field on rename.
          <ProviderOverrideEditor
            key={getOverridePath(overrideSource)}
            source={overrideSource}
            displayName={getOverrideProviderDisplayName(overrideSource.providerId)}
            inheritance={overrideInheritance}
            onDraftParseValidityChange={handleDraftParseValidityChange}
            {...getEditorExtras?.(overrideSource)}
          />
        ) : (
          defaultContent && (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              {defaultContentActions && (
                <div className="flex shrink-0 items-center justify-end">{defaultContentActions}</div>
              )}
              <div className="rounded-12 bg-bg-weak flex min-h-0 flex-1 flex-col gap-2 border border-neutral-100 p-2">
                {defaultContent}
              </div>
            </div>
          )
        )}
      </TabsSection>

      <RemoveOverrideModal
        source={pendingResetSource}
        providerOptions={providerOptions}
        overrides={overrides}
        onConfirm={handleConfirmReset}
        onCancel={() => setPendingResetSource(null)}
      />
    </div>
  );
}
