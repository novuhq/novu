import { TranslationGroupDto } from '@novu/api/models/components';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFetchTranslation } from '@/hooks/use-fetch-translation';
import { useSaveTranslation } from '@/hooks/use-save-translation';
import { useTranslationEditor } from './hooks';

export function useTranslationDrawerLogic(
  translationGroup: TranslationGroupDto,
  initialLocale?: string,
  onLocaleChange?: (locale: string) => void
) {
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);

  const resource = useMemo(
    () => ({
      resourceId: translationGroup.resourceId,
      resourceType: translationGroup.resourceType,
    }),
    [translationGroup.resourceId, translationGroup.resourceType]
  );

  useEffect(() => {
    setSelectedLocale((current) => {
      if (current && translationGroup.locales.includes(current)) {
        return current;
      }

      if (initialLocale && translationGroup.locales.includes(initialLocale)) {
        return initialLocale;
      }

      return translationGroup.locales[0] || null;
    });
  }, [translationGroup.locales, initialLocale]);

  const {
    data: selectedTranslation,
    isLoading: isLoadingTranslation,
    error: translationError,
  } = useFetchTranslation({
    resourceId: resource.resourceId,
    resourceType: resource.resourceType,
    locale: selectedLocale || '',
  });

  const editor = useTranslationEditor(selectedTranslation);
  const saveTranslationMutation = useSaveTranslation();

  const handleLocaleSelect = useCallback(
    (locale: string) => {
      setSelectedLocale(locale);
      onLocaleChange?.(locale);
    },
    [onLocaleChange]
  );

  const handleSave = useCallback(async () => {
    if (!editor.modifiedContent || !selectedLocale) return;

    await saveTranslationMutation.mutateAsync({
      ...resource,
      locale: selectedLocale,
      content: editor.modifiedContent,
    });

    editor.resetContent();
  }, [editor, selectedLocale, saveTranslationMutation, resource]);

  return {
    selectedLocale,
    selectedTranslation,
    isLoadingTranslation,
    translationError,

    editor,
    saveTranslationMutation,

    handleLocaleSelect,
    handleSave,
  };
}
