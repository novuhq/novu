import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QueryKeys } from '../api/query.keys';
import { createLayout, getLayoutById, updateLayoutById } from '../api/layouts';
import { ILayoutEntity } from '@novu/shared';

export function useLayoutsEditor(id: string) {
  const queryClient = useQueryClient();
  const { mutateAsync: createNewLayout, isLoading: isLoadingCreate } = useMutation(createLayout, {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.changesCount]);
    },
  });

  const { mutateAsync: updateLayout, isLoading: isLoadingUpdate } = useMutation<
    ILayoutEntity,
    { error: string; message: string; statusCode: number },
    { layoutId: string; data: any }
  >(({ layoutId, data }) => updateLayoutById(layoutId, data), {
    onSuccess: () => {
      queryClient.refetchQueries([QueryKeys.changesCount]);
    },
  });

  const { data: layout, isLoading: isLoadingLayout } = useQuery<ILayoutEntity>(
    [QueryKeys.getLayoutById, id],
    () => getLayoutById(id),
    {
      enabled: !!id,
    }
  );

  return {
    layout,
    isLoading: (!!id && isLoadingLayout) || isLoadingCreate || isLoadingUpdate,
    createNewLayout,
    updateLayout,
  };
}
