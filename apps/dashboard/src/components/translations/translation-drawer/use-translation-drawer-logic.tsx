import { useState, useCallback, useMemo, useEffect } from 'react';
import { TranslationGroup } from '@/api/translations';
import { useFetchTranslation } from '@/hooks/use-fetch-translation';
import { useSaveTranslation } from '@/hooks/use-save-translation';
import { useDeleteTranslation } from '@/hooks/use-delete-translation';
import { useTranslationEditor } from './hooks';

export function useTranslationDrawerLogic(translationGroup: TranslationGroup, defaultLocale?: string) {
  const [selectedLocale, setSelectedLocale] = useState<string | null>(null);

  const resource = useMemo(
    () => ({
      resourceId: translationGroup.resourceId,
      resourceType: translationGroup.resourceType,
    }),
    [translationGroup.resourceId, translationGroup.resourceType]
  );

  useEffect(() => {
    // Prioritize default locale if it exists in the locales list
    const preferredLocale =
      defaultLocale && translationGroup.locales.includes(defaultLocale)
        ? defaultLocale
        : translationGroup.locales[0] || null;
    setSelectedLocale(preferredLocale);
  }, [translationGroup.locales, translationGroup.updatedAt, defaultLocale]);

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

  const handleLocaleSelect = useCallback((locale: string) => {
    setSelectedLocale(locale);
  }, []);

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

      // React Query will automatically refetch and useEffect will handle the update

      const remainingLocales = translationGroup.locales.filter((l) => l !== locale);
      // Prioritize default locale if it exists in remaining locales
      const nextLocale =
        defaultLocale && remainingLocales.includes(defaultLocale) ? defaultLocale : remainingLocales[0] || null;
      setSelectedLocale(nextLocale);
    },
    [deleteTranslationMutation, resource, translationGroup.locales, defaultLocale]
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
