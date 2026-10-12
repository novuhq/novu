import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/primitives/dialog';
import {
  ALL_INTEGRATIONS_LABEL,
  getIntegrationName,
  getOverrideProviderDisplayName,
  hasOwn,
  type OverrideContentSource,
  type OverrideValues,
  type ProviderOverrideOption,
} from './content-source';

const MODAL_BUTTON_CLASS = 'text-label-2xs h-5 rounded-[5px] px-2';

type RemoveOverrideCopy = {
  title: string;
  description: string;
};

function joinNames(names: string[]): string {
  if (names.length <= 2) {
    return names.join(' and ');
  }

  return `${names.length} integrations`;
}

function getRemoveOverrideCopy(
  source: OverrideContentSource,
  providerOptions: ProviderOverrideOption[],
  overrides: OverrideValues
): RemoveOverrideCopy {
  const { providerId, integrationIdentifier } = source;
  const providerOption = providerOptions.find((option) => option.providerId === providerId);
  const providerName = providerOption?.displayName ?? getOverrideProviderDisplayName(providerId);

  if (integrationIdentifier !== undefined) {
    const integrationName = getIntegrationName(providerId, integrationIdentifier, providerOptions);
    const fallback = hasOwn(overrides.providerOverrides, providerId)
      ? `${providerName} · ${ALL_INTEGRATIONS_LABEL}, then Default content`
      : 'Default content';

    return {
      title: `Remove ${integrationName} override?`,
      description: `${integrationName} will fall back to ${fallback}.`,
    };
  }

  if (!providerOption || providerOption.integrations.length === 0) {
    return {
      title: `Remove the ${providerName} override?`,
      description: `${providerName} will fall back to Default content.`,
    };
  }

  const keptNames = Object.keys(overrides.integrationOverrides?.[providerId] ?? {}).map((identifier) =>
    getIntegrationName(providerId, identifier, providerOptions)
  );
  const fallback = `All ${providerName} integrations fall back to Default content.`;

  if (keptNames.length === 0) {
    return { title: `Remove the override for all ${providerName} integrations?`, description: fallback };
  }

  const kept =
    keptNames.length === 1
      ? `${keptNames[0]} keeps its own override and now merges directly over Default content.`
      : `${joinNames(keptNames)} keep their own overrides and now merge directly over Default content.`;

  return {
    title: `Remove the override for all ${providerName} integrations?`,
    description: `${fallback} ${kept}`,
  };
}

type RemoveOverrideModalProps = {
  source: OverrideContentSource | null;
  providerOptions: ProviderOverrideOption[];
  overrides: OverrideValues;
  onConfirm: () => void;
  onCancel: () => void;
};

export function RemoveOverrideModal({
  source,
  providerOptions,
  overrides,
  onConfirm,
  onCancel,
}: RemoveOverrideModalProps) {
  // Keeps the last source's copy on screen while the dialog animates closed after `source` is cleared.
  const [displayedSource, setDisplayedSource] = useState(source);
  if (source && source !== displayedSource) {
    setDisplayedSource(source);
  }

  const copy = displayedSource ? getRemoveOverrideCopy(displayedSource, providerOptions, overrides) : undefined;

  return (
    <Dialog
      modal
      open={source !== null}
      onOpenChange={(open) => {
        if (!open) {
          onCancel();
        }
      }}
    >
      <DialogContent className="w-[320px] min-w-0 gap-1.5 overflow-hidden rounded-xl! p-4" hideCloseButton>
        <DialogTitle className="text-label-sm text-text-strong font-medium tracking-[-0.084px]">
          {copy?.title}
        </DialogTitle>
        <DialogDescription className="text-paragraph-xs text-text-sub">{copy?.description}</DialogDescription>
        <DialogFooter className="mt-2.5 gap-2 px-4 py-3 sm:space-x-0">
          <Button
            type="button"
            size="2xs"
            mode="outline"
            variant="secondary"
            className={MODAL_BUTTON_CLASS}
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button type="button" size="2xs" variant="error" className={MODAL_BUTTON_CLASS} onClick={onConfirm}>
            Remove override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
