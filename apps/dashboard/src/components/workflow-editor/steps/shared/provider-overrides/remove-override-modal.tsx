import { useState } from 'react';
import { Button } from '@/components/primitives/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from '@/components/primitives/dialog';
import type { ProviderOverrideOption } from './override-options';
import {
  getSourceOverride,
  integrationSource,
  type OverrideContentSource,
  type OverrideValues,
  providerSource,
} from './override-source';
import { DEFAULT_CONTENT_LABEL, describeOverrideSource } from './override-source-description';

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
  const { providerName, ownerLabel, isGrouped } = describeOverrideSource(source, providerOptions);

  switch (source.kind) {
    case 'integration': {
      const parent = providerSource(source.providerId);
      const fallback =
        getSourceOverride(parent, overrides) === undefined
          ? DEFAULT_CONTENT_LABEL
          : `${describeOverrideSource(parent, providerOptions).qualifiedLabel}, then ${DEFAULT_CONTENT_LABEL}`;

      return {
        title: `Remove ${ownerLabel} override?`,
        description: `${ownerLabel} will fall back to ${fallback}.`,
      };
    }
    case 'provider': {
      if (!isGrouped) {
        return {
          title: `Remove the ${providerName} override?`,
          description: `${providerName} will fall back to ${DEFAULT_CONTENT_LABEL}.`,
        };
      }

      const keptNames = Object.keys(overrides.integrationOverrides?.[source.providerId] ?? {}).map(
        (identifier) =>
          describeOverrideSource(integrationSource(source.providerId, identifier), providerOptions).ownerLabel
      );
      const title = `Remove the override for all ${providerName} integrations?`;
      const fallback = `All ${providerName} integrations fall back to ${DEFAULT_CONTENT_LABEL}.`;

      if (keptNames.length === 0) {
        return { title, description: fallback };
      }

      const kept =
        keptNames.length === 1
          ? `${keptNames[0]} keeps its own override and now merges directly over ${DEFAULT_CONTENT_LABEL}.`
          : `${joinNames(keptNames)} keep their own overrides and now merge directly over ${DEFAULT_CONTENT_LABEL}.`;

      return { title, description: `${fallback} ${kept}` };
    }
    default: {
      const unhandled: never = source;

      return unhandled;
    }
  }
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
