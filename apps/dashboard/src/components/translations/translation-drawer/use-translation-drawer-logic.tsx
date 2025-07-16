import { useState, useCallback, useMemo, useEffect } from 'react';
import { TranslationGroup } from '@/api/translations';
import { useFetchTranslation } from '@/hooks/use-fetch-translation';
import { useSaveTranslation } from '@/hooks/use-save-translation';
import { useDeleteTranslation } from '@/hooks/use-delete-translation';
import { useTranslationEditor } from './hooks';

export function useTranslationDrawerLogic(
  translationGroup: TranslationGroup,
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
    // Prioritize initialLocale, then fall back to first locale
    const preferredLocale =
      initialLocale && translationGroup.locales.includes(initialLocale)
        ? initialLocale
        : translationGroup.locales[0] || null;
    setSelectedLocale(preferredLocale);
  }, [translationGroup.locales, translationGroup.updatedAt, initialLocale]);

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
  const deleteTranslationMutation = useDeleteTranslation();

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

  const handleDelete = useCallback(
    async (locale: string) => {
      await deleteTranslationMutation.mutateAsync({
        ...resource,
        locale,
      });

      const remainingLocales = translationGroup.locales.filter((l) => l !== locale);
      // Select the first remaining locale
      const nextLocale = remainingLocales[0] || null;
      setSelectedLocale(nextLocale);
    },
    [deleteTranslationMutation, resource, translationGroup.locales]
  );

  return {
    selectedLocale,
    selectedTranslation,
    isLoadingTranslation,
    translationError,
    resource,

    editor,
    saveTranslationMutation,
    deleteTranslationMutation,

    handleLocaleSelect,
    handleSave,
    handleDelete,
  };
}
