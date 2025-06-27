import { useState, useCallback, useMemo, useEffect } from 'react';
import { TranslationGroup } from '@/api/translations';
import { useFetchTranslation } from '@/hooks/use-fetch-translation';
import { useSaveTranslation } from '@/hooks/use-save-translation';
import { useDeleteTranslation } from '@/hooks/use-delete-translation';
import { useTranslationEditor } from './hooks';

export function useTranslationDrawerLogic(
  translationGroup: TranslationGroup,
  onTranslationGroupUpdated?: (resourceId: string) => void | Promise<void>
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
    const firstLocale = translationGroup.locales[0] || null;
    setSelectedLocale(firstLocale);
  }, [translationGroup.locales, translationGroup.updatedAt]);

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

      onTranslationGroupUpdated?.(resource.resourceId);

      const remainingLocales = translationGroup.locales.filter((l) => l !== locale);
      const nextLocale = remainingLocales[0] || null;
      setSelectedLocale(nextLocale);
    },
    [deleteTranslationMutation, resource, onTranslationGroupUpdated, translationGroup.locales]
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
