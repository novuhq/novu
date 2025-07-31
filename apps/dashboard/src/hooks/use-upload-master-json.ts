import { useMutation, useQueryClient } from '@tanstack/react-query';
import { UploadMasterJsonResponse, uploadMasterJson } from '@/api/translations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

type UseUploadMasterJsonProps = {
  onSuccess?: (result: UploadMasterJsonResponse['data']) => void;
  onError?: (error: Error) => void;
};

export function useUploadMasterJson({ onSuccess, onError }: UseUploadMasterJsonProps = {}) {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async ({ file }: { file: File }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return await uploadMasterJson({
        environment: currentEnvironment,
        file,
      });
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroups],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationKeys],
        exact: false,
      });

      queryClient.invalidateQueries({
        queryKey: [QueryKeys.diffEnvironments],
      });

      const { success = false, message = 'Import completed', successful, failed } = result || {};

      if (success) {
        if (successful?.length && failed?.length) {
          showSuccessToast(`${message} (${successful.length} succeeded, ${failed.length} failed)`);
        } else if (successful?.length) {
          showSuccessToast(`${message} (${successful.length} resource${successful.length !== 1 ? 's' : ''})`);
        } else {
          showSuccessToast(message);
        }
      } else {
        if (failed?.length) {
          showErrorToast(`${message} (${failed.length} resource${failed.length !== 1 ? 's' : ''} failed)`);
        } else {
          showErrorToast(message);
        }
      }

      onSuccess?.(result);
    },
    onError: (error: Error) => {
      showErrorToast(`Failed to import translations: ${error.message}`);
      onError?.(error);
    },
  });

  const triggerFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];

      if (file) {
        mutation.mutate({ file });
      }
    };

    input.click();
  };

  return {
    ...mutation,
    triggerFileUpload,
  };
}

export function getImportSummary(result: UploadMasterJsonResponse['data']) {
  const { successful = [], failed = [] } = result;

  return {
    totalProcessed: successful.length + failed.length,
    successCount: successful.length,
    failureCount: failed.length,
    successfulResources: successful,
    failedResources: failed,
    hasPartialSuccess: successful.length > 0 && failed.length > 0,
    isCompleteSuccess: successful.length > 0 && failed.length === 0,
    isCompleteFailure: successful.length === 0 && failed.length > 0,
  };
}
