import { DEFAULT_LOCALE } from '@novu/shared';
import React, { useImperativeHandle, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { VariableList, VariableListRef } from '@/components/variable/variable-list';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { LocalizationResourceEnum, TranslationKey } from '@/types/translations';
import { buildRoute, ROUTES } from '@/utils/routes';
import { NewTranslationKeyPreview } from './new-translation-key-preview';

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

export const TranslationSuggestionsListView = React.forwardRef<
  TranslationSuggestionsPopoverRef,
  TranslationSuggestionsPopoverProps & { translationKeys?: TranslationKey[] }
>(({ items, onSelectItem, translationKeys = [] }, ref) => {
  const { environmentSlug } = useParams();
  const { workflow } = useWorkflow();
  const { data: organizationSettings } = useFetchOrganizationSettings();

  const defaultLocale = organizationSettings?.data?.defaultLocale ?? DEFAULT_LOCALE;

  const translationsUrl = buildRoute(ROUTES.TRANSLATIONS_EDIT, {
    environmentSlug: environmentSlug ?? '',
    resourceType: LocalizationResourceEnum.WORKFLOW,
    resourceId: workflow?.workflowId ?? '',
    locale: DEFAULT_LOCALE,
  });

  const options = useMemo(() => {
    return items.map((item: TranslationKeyItem): { label: string; value: string; preview?: React.ReactNode } => {
      // Check if this item is a new translation key by seeing if it exists in translationKeys
      const existingKeys = translationKeys.map((key) => key.name);
      const isNewTranslationKeyItem = !existingKeys.includes(item.name);

      if (isNewTranslationKeyItem) {
        const displayLabel = `Create "${item.name}"`;

        return {
          label: displayLabel,
          value: item.name,
          preview: <NewTranslationKeyPreview locale={defaultLocale} translationsUrl={translationsUrl} />,
        };
      }

      return {
        label: item.name,
        value: item.name,
      };
    });
  }, [items, translationKeys, defaultLocale, translationsUrl]);

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
      className="min-w-[250px] rounded-md border shadow-md outline-none"
      options={options}
      onSelect={onSelect}
      title="Translation Keys"
      context="translations"
    />
  );
});
