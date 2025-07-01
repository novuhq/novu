import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchOrganizationSettings } from '@/hooks/use-fetch-organization-settings';
import { saveTranslation, getTranslation } from '@/api/translations';
import { LocalizationResourceEnum } from '@/components/translations/types';
import { QueryKeys } from '@/utils/query-keys';
import { DEFAULT_LOCALE } from '@novu/shared';
import { showErrorToast } from '@/components/primitives/sonner-helpers';

type UpdateTranslationValueParams = {
  workflowId: string;
  translationKey: string;
  translationValue: string;
};

export const useUpdateTranslationValue = () => {
  const { currentEnvironment } = useEnvironment();
  const { data: organizationSettings } = useFetchOrganizationSettings();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ workflowId, translationKey, translationValue }: UpdateTranslationValueParams) => {
      if (!currentEnvironment?._id) {
        throw new Error('Environment not found');
      }

      const defaultLocale = organizationSettings?.data?.defaultLocale || DEFAULT_LOCALE;

      // Get existing translation content
      let existingContent = {};

      try {
        const existingTranslation = await getTranslation({
          environment: currentEnvironment,
          resourceId: workflowId,
          resourceType: LocalizationResourceEnum.WORKFLOW,
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

      // Invalidate all preview-step queries to update the preview
      queryClient.invalidateQueries({
        queryKey: ['preview-step'],
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
