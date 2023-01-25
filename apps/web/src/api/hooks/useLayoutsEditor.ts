import { useMutation, useQuery } from '@tanstack/react-query';
import { QueryKeys } from '../query.keys';
import { createLayout, getLayoutById, updateLayoutById } from '../layouts';
import { ILayoutEntity } from '@novu/shared';

export function useLayoutsEditor(id: string) {
  const { mutateAsync: createNewLayout, isLoading: isLoadingCreate } = useMutation(createLayout);

  const { mutateAsync: updateLayout, isLoading: isLoadingUpdate } = useMutation<
    ILayoutEntity,
    { error: string; message: string; statusCode: number },
    { layoutId: string; data: any }
  >(({ layoutId, data }) => updateLayoutById(layoutId, data));

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
