import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { uploadTranslations } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';

type UploadTranslationsParameters = OmitEnvironmentFromParameters<typeof uploadTranslations>;

export const useUploadTranslations = ({ onSuccess }: { onSuccess?: () => void } = {}) => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UploadTranslationsParameters) =>
      uploadTranslations({ environment: currentEnvironment!, ...args }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslation, currentEnvironment?._id],
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
        exact: false,
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroups],
        exact: false,
      });

      showSuccessToast('Translations uploaded successfully');
      onSuccess?.();
    },
    onError: (error) => {
      showErrorToast(error instanceof Error ? error.message : 'Failed to upload translations', 'Upload failed');
    },
  });
};
