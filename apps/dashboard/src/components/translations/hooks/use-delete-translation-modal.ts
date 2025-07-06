import { useState, useCallback } from 'react';
import { TranslationGroup } from '@/api/translations';
import { useDeleteTranslationGroup } from '@/hooks/use-delete-translation-group';

export function useDeleteTranslationModal() {
  const [deleteModalTranslation, setDeleteModalTranslation] = useState<TranslationGroup | null>(null);
  const { mutateAsync: deleteTranslationGroup, isPending: isDeletePending } = useDeleteTranslationGroup();

  const handleDeleteClick = useCallback((translation: TranslationGroup) => {
    setDeleteModalTranslation(translation);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (deleteModalTranslation) {
      await deleteTranslationGroup({
        resourceId: deleteModalTranslation.resourceId,
        resourceType: deleteModalTranslation.resourceType,
      });
      setDeleteModalTranslation(null);
    }
  }, [deleteModalTranslation, deleteTranslationGroup]);

  const handleDeleteCancel = useCallback(() => {
    setDeleteModalTranslation(null);
  }, []);

  return {
    deleteModalTranslation,
    isDeletePending,
    handleDeleteClick,
    handleDeleteConfirm,
    handleDeleteCancel,
  };
}
