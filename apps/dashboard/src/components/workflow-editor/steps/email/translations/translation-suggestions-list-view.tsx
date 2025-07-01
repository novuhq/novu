import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { VariableList, VariableListRef } from '@/components/variable/variable-list';
import { VariablePreview } from '@/components/variable/components/variable-preview';
import { Badge } from '@/components/primitives/badge';
import { buildRoute, ROUTES } from '@/utils/routes';
import { useParams } from 'react-router-dom';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { DEFAULT_LOCALE } from '@novu/shared';

export type TranslationKeyItem = {
  name: string;
  id: string;
  type?: string;
  displayLabel?: string;
};

type TranslationSuggestionsPopoverProps = {
  items: TranslationKeyItem[];
  onSelectItem: (item: TranslationKeyItem) => void;
};

type TranslationSuggestionsPopoverRef = {
  moveUp: () => void;
  moveDown: () => void;
  select: () => void;
};

function NewTranslationKeyPreview() {
  const { environmentSlug } = useParams();
  const { workflow } = useWorkflow();
  const { data: organizationSettings } = useFetchOrganizationSettings();

  const defaultLocale = organizationSettings?.data?.defaultLocale ?? DEFAULT_LOCALE;

  const translationsUrl = buildRoute(ROUTES.TRANSLATIONS, {
    environmentSlug: environmentSlug ?? '',
  });

  const translationsUrlWithSearch = workflow?.name
    ? `${translationsUrl}?query=${encodeURIComponent(workflow.name)}`
    : translationsUrl;

  return (
    <VariablePreview className="min-w-[300px]">
      <VariablePreview.Content>
        <div className="text-text-sub text-paragraph-2xs font-medium leading-normal">
          <Badge variant="lighter" color="orange" size="sm" className="mb-2">
            💡 TIP
          </Badge>
          <p>
            Adds a new translation key to {defaultLocale}.json. This makes the translations outdated, update the
            translations by:
          </p>
          <ul className="mt-1 list-disc pl-3">
            <li>Exporting the updated {defaultLocale}.json</li>
            <li>Translating the new key(s)</li>
            <li>Re-uploading each localized file</li>
          </ul>
          <a
            href={translationsUrlWithSearch}
            className="text-text-sub mt-2 block text-[10px] font-medium leading-normal underline"
          >
            Insert & manage translations ↗
          </a>
        </div>
      </VariablePreview.Content>
    </VariablePreview>
  );
}

export const TranslationSuggestionsListView = React.forwardRef<
  TranslationSuggestionsPopoverRef,
  TranslationSuggestionsPopoverProps & { translationKeys?: { name: string }[] }
>(({ items, onSelectItem, translationKeys = [] }, ref) => {
  const options = useMemo(() => {
    return items.map((item: TranslationKeyItem): { label: string; value: string; preview?: React.ReactNode } => {
      // Check if this item is a new translation key by seeing if it exists in translationKeys
      const existingKeys = translationKeys.map((key) => key.name);
      const isNewTranslationKeyItem = !existingKeys.includes(item.name);

      if (isNewTranslationKeyItem) {
        const displayLabel = `Create ${item.name}`;

        return {
          label: displayLabel,
          value: item.name,
          preview: <NewTranslationKeyPreview />,
        };
      }

      return {
        label: item.name,
        value: item.name,
      };
    });
  }, [items, translationKeys]);

  const variablesListRef = useRef<VariableListRef>(null);

  const onSelect = (value: string) => {
    const item = items.find((item: TranslationKeyItem) => item.name === value);

    if (!item) {
      return;
    }

    onSelectItem(item);
  };

  useImperativeHandle(ref, () => ({
    moveUp: () => {
      variablesListRef.current?.prev();
    },
    moveDown: () => {
      variablesListRef.current?.next();
    },
    select: () => {
      variablesListRef.current?.select();
    },
  }));

  if (items.length === 0) {
    return null;
  }

  return (
    <VariableList
      ref={variablesListRef}
      className="rounded-md border shadow-md outline-none"
      options={options}
      onSelect={onSelect}
      title="Translation Keys"
      context="translations"
    />
  );
});
