import { useMemo } from 'react';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { createTranslationAutocompleteSource } from '@/components/primitives/translation-plugin/autocomplete';
import { useCreateTranslationKey } from './use-create-translation-key';
import { useFetchTranslationKeys } from './use-fetch-translation-keys';
import { useIsTranslationEnabled } from './use-is-translation-enabled';

export const useTranslationCompletionSource = ({ workflow }: { workflow?: { _id: string } }) => {
  const isTranslationEnabled = useIsTranslationEnabled();
  const createTranslationKeyMutation = useCreateTranslationKey();
  const { translationKeys } = useFetchTranslationKeys({
    workflowId: workflow?._id || '',
    enabled: isTranslationEnabled && !!workflow?._id,
  });

  const translationCompletionSource = useMemo(() => {
    if (!isTranslationEnabled) return [];

    return [
      createTranslationAutocompleteSource({
        translationKeys,
        onCreateNewTranslationKey: async (translationKey: string) => {
          if (!workflow?._id) return;

          try {
            await createTranslationKeyMutation.mutateAsync({
              workflowId: workflow._id,
              translationKey,
              defaultValue: `[${translationKey}]`,
            });
          } catch {
            showErrorToast('Failed to create translation key');
          }
        },
      }),
    ];
  }, [translationKeys, createTranslationKeyMutation, workflow?._id, isTranslationEnabled]);

  return translationCompletionSource;
};
