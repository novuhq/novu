import { useCallback } from 'react';
import { useCreateTranslationKey } from '@/hooks/use-create-translation-key';
import { useTranslationValidation } from '@/hooks/use-translation-validation';
import { LocalizationResourceEnum, TranslationKey } from '@/types/translations';

export const useTranslationForm = (
  editKey: string,
  editValue: string,
  resourceId: string,
  resourceType: LocalizationResourceEnum,
  translationKey: string,
  availableKeys: TranslationKey[],
  onReplaceKey?: (newKey: string) => void,
  onClose?: () => void
) => {
  const createTranslationKeyMutation = useCreateTranslationKey();

  const validation = useTranslationValidation({
    translationKey: editKey,
    availableKeys,
    allowEmpty: true,
  });

  const handleAddTranslationKey = useCallback(async () => {
    const newKey = editKey.trim();
    const oldKey = translationKey;

    const result = await createTranslationKeyMutation.mutateAsync({
      resourceId,
      resourceType,
      translationKey: newKey,
      defaultValue: editValue || `[${newKey}]`,
    });

    if (result) {
      if (onReplaceKey && newKey !== oldKey) {
        onReplaceKey(newKey);
      }

      onClose?.();
    }
  }, [
    editKey,
    editValue,
    resourceId,
    resourceType,
    createTranslationKeyMutation,
    translationKey,
    onReplaceKey,
    onClose,
  ]);

  return {
    validation,
    handleAddTranslationKey,
    isCreatingKey: createTranslationKeyMutation.isPending,
  };
};
