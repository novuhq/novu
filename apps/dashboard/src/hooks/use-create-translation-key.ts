import { DEFAULT_LOCALE } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getTranslation, saveTranslation } from '@/api/translations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { LocalizationResourceEnum } from '@/types/translations';
import { QueryKeys } from '@/utils/query-keys';

type CreateTranslationKeyParams = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  translationKey: string;
  defaultValue?: string;
};

export const useCreateTranslationKey = () => {
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ resourceId, resourceType, translationKey, defaultValue = '' }: CreateTranslationKeyParams) => {
      const environment = requireEnvironment(currentEnvironment, 'Environment is required');
      const defaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

      // First, try to get existing translation content
      let existingContent: Record<string, unknown> = {};

      try {
        const existingTranslation = await getTranslation({
          environment,
          resourceId,
          resourceType,
          locale: defaultLocale,
        });

        existingContent = existingTranslation.content || {};
      } catch (error) {
        // If translation doesn't exist, we'll create it with empty content
        console.debug('No existing translation found, creating new one');
      }

      // Add the new translation key to the content
      const updatedContent = { ...existingContent };

      // Handle nested keys (e.g., "common.button.submit" -> { common: { button: { submit: value } } })
      const keyParts = translationKey.split('.');
      let current = updatedContent;

      for (let i = 0; i < keyParts.length - 1; i++) {
        const part = keyParts[i];

        if (!current[part] || typeof current[part] !== 'object') {
          current[part] = {};
        }

        current = current[part] as Record<string, unknown>;
      }

      // Set the final key value
      const finalKey = keyParts[keyParts.length - 1];
      current[finalKey] = defaultValue;

      // Save the updated translation
      return await saveTranslation({
        environment,
        resourceId,
        resourceType,
        locale: defaultLocale,
        content: updatedContent,
      });
    },
    onSuccess: (result, variables) => {
      const defaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

      // Invalidate translation keys query to refresh the list
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationKeys, variables.resourceId, defaultLocale, currentEnvironment?._id],
      });

      // Invalidate the specific translation query
      queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchTranslation,
          variables.resourceId,
          variables.resourceType,
          defaultLocale,
          currentEnvironment?._id,
        ],
      });

      // Invalidate the translation group
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroup],
        exact: false,
      });

      // Invalidate diff environment queries when translation keys are created
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      showSuccessToast(`Translation key "${variables.translationKey}" created successfully`);
    },
    onError: (error, variables) => {
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to create translation key',
        `Failed to create "${variables.translationKey}"`
      );
    },
  });
};
