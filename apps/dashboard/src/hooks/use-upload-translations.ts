import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NovuApiError } from '@/api/api.client';
import { uploadTranslations } from '@/api/translations';
import { showErrorToast, showSuccessToast, showWarningToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type UploadTranslationsParameters = OmitEnvironmentFromParameters<typeof uploadTranslations>;

export const useUploadTranslations = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UploadTranslationsParameters) =>
      uploadTranslations({ environment: currentEnvironment!, ...args }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslation, variables.resourceId, variables.resourceType],
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: [
          QueryKeys.fetchTranslationGroup,
          variables.resourceId,
          variables.resourceType,
          currentEnvironment?._id,
        ],
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroups],
        exact: false,
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      // Check if there were any failures in the upload
      if (data.failedUploads > 0) {
        // Partial success - some files uploaded, some failed
        const errorMessage = data.errors.join('\n');
        showWarningToast(
          `${data.successfulUploads} of ${data.totalFiles} files uploaded successfully. ${data.failedUploads} failed:\n${errorMessage}`,
          'Partial Upload'
        );
      } else {
        // Complete success - all files uploaded
        showSuccessToast(`All ${data.totalFiles} translation files uploaded successfully`);
      }

      onSuccess?.();
    },
    onError: (error) => {
      let errorMessage = 'Failed to upload translations';

      // Check if it's a NovuApiError with rawError containing detailed errors
      if (error instanceof NovuApiError && error.rawError) {
        const errorData = error.rawError as any;

        // Check for detailed errors in errors array
        if (errorData.errors && Array.isArray(errorData.errors)) {
          errorMessage = errorData.errors.join('\n');
        } else if (errorData.message) {
          errorMessage = errorData.message;
        } else {
          errorMessage = error.message;
        }
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      showErrorToast(errorMessage, 'Upload failed');
    },
  });
};
