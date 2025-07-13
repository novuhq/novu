import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { deleteTranslationGroup } from '@/api/translations';
import { QueryKeys } from '@/utils/query-keys';
import { OmitEnvironmentFromParameters } from '@/utils/types';
import { LocalizationResourceEnum } from '@/types/translations';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';

type DeleteTranslationGroupParameters = OmitEnvironmentFromParameters<typeof deleteTranslationGroup>;

export const useDeleteTranslationGroup = () => {
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (args: DeleteTranslationGroupParameters) =>
      deleteTranslationGroup({ environment: currentEnvironment!, ...args }),
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries({
        queryKey: [QueryKeys.fetchTranslationGroups],
        exact: false,
      });

      if (variables.resourceType === LocalizationResourceEnum.WORKFLOW) {
        await queryClient.invalidateQueries({
          queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id],
          exact: false,
        });

        await queryClient.refetchQueries({
          queryKey: [QueryKeys.fetchWorkflow, currentEnvironment?._id],
          exact: false,
        });
      }

      showSuccessToast('Translation group deleted successfully');
    },
    onError: (error) => {
      showErrorToast(error instanceof Error ? error.message : 'Failed to delete translation group', 'Delete failed');
    },
  });
};
