import { DEFAULT_LOCALE } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getTranslation, saveTranslation } from '@/api/translations';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { LocalizationResourceEnum } from '@/types/translations';
import { QueryKeys } from '@/utils/query-keys';

export type UpdateTranslationValueParams = {
  resourceId: string;
  resourceType: LocalizationResourceEnum;
  translationKey: string;
  translationValue: string;
};

export const useUpdateTranslationValue = () => {
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      resourceType,
      translationKey,
      translationValue,
    }: UpdateTranslationValueParams) => {
      if (!currentEnvironment?._id) {
        throw new Error('Environment not found');
      }

      const defaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

      // Get existing translation content
      let existingContent = {};

      try {
        const existingTranslation = await getTranslation({
          environment: currentEnvironment,
          resourceId,
          resourceType,
          locale: defaultLocale,
        });

        if (existingTranslation?.content) {
          existingContent = existingTranslation.content;
        }
      } catch (error) {
        // If translation doesn't exist, start with empty object
        console.log('No existing translation found, creating new one');
      }

      // Helper function to set nested property using dot notation
      const setNestedProperty = (obj: any, path: string, value: string) => {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
          const key = keys[i];

          if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
            current[key] = {};
          }

          current = current[key];
        }

        current[keys[keys.length - 1]] = value;
      };

      // Update the content with the new translation value
      const updatedContent = { ...existingContent };
      setNestedProperty(updatedContent, translationKey, translationValue);

      // Save the updated translation
      return await saveTranslation({
        environment: currentEnvironment,
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

      // Invalidate all preview-step queries to update the preview
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.previewStep],
      });
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.previewLayout],
      });

      // Invalidate diff environment queries when translations are updated
      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });
    },
    onError: (error, variables) => {
      showErrorToast(
        error instanceof Error ? error.message : 'Failed to update translation',
        `Failed to update "${variables.translationKey}"`
      );
    },
  });
};
