import { useQuery } from '@tanstack/react-query';
import { useEnvController } from '../../store/use-env-controller';
import { QueryKeys } from '../query.keys';
import { getLayoutsList } from '../layouts';
import { ILayoutEntity } from '@novu/shared';

export function useLayouts(page = 0, pageSize = 10) {
  const { environment } = useEnvController();
  const { data, isLoading } = useQuery<{
    data: ILayoutEntity[];
    totalCount: number;
    pageSize: number;
  }>([QueryKeys.getLayoutsList, environment?._id, page, pageSize], () => getLayoutsList(page, pageSize), {
    keepPreviousData: true,
  });

  return {
    layouts: data?.data,
    isLoading,
    totalCount: data?.totalCount,
    pageSize: data?.pageSize,
  };
}
