import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { saveTranslation, getTranslation } from '@/api/translations';
import { LocalizationResourceEnum } from '@/components/translations/types';
import { QueryKeys } from '@/utils/query-keys';
import { DEFAULT_LOCALE } from '@novu/shared';
import { showSuccessToast, showErrorToast } from '@/components/primitives/sonner-helpers';

type CreateTranslationKeyParams = {
  workflowId: string;
  translationKey: string;
  defaultValue?: string;
};

export const useCreateTranslationKey = () => {
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, translationKey, defaultValue = '' }: CreateTranslationKeyParams) => {
      if (!currentEnvironment) {
        throw new Error('Environment is required');
      }

      const defaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

      // First, try to get existing translation content
      let existingContent: Record<string, unknown> = {};

      try {
        const existingTranslation = await getTranslation({
          environment: currentEnvironment,
          resourceId: workflowId,
          resourceType: LocalizationResourceEnum.WORKFLOW,
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
        environment: currentEnvironment,
        resourceId: workflowId,
        resourceType: LocalizationResourceEnum.WORKFLOW,
        locale: defaultLocale,
        content: updatedContent,
      });
    },
    onSuccess: (result, variables) => {
      const defaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

      // Invalidate translation keys query to refresh the list
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationKeys, variables.workflowId, defaultLocale, currentEnvironment?._id],
      });

      // Invalidate the specific translation query
      queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchTranslation,
          variables.workflowId,
          LocalizationResourceEnum.WORKFLOW,
          defaultLocale,
          currentEnvironment?._id,
        ],
      });

      // Invalidate the translations list
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
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
