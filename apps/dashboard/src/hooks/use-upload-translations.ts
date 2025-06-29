import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { uploadTranslations } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';

type UploadTranslationsParameters = OmitEnvironmentFromParameters<typeof uploadTranslations>;

export const useUploadTranslations = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: UploadTranslationsParameters) =>
      uploadTranslations({ environment: currentEnvironment!, ...args }),
    onSuccess: async (result, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslation, currentEnvironment?._id],
      });

      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
        exact: false,
      });

      await queryClient.refetchQueries({
        queryKey: [QueryKeys.fetchTranslations, currentEnvironment?._id],
        exact: false,
      });
    },
  });
};
