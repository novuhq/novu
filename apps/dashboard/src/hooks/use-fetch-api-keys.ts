import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '@/context/environment/hooks';
import { IApiKey } from '@novu/shared';
import { getApiKeys } from '../api/environments';

export const useFetchApiKeys = () => {
  const { currentEnvironment } = useEnvironment();

  const query = useQuery<{ data: IApiKey[] }>({
    queryKey: [QueryKeys.getApiKeys, currentEnvironment?._id],
    queryFn: async () => await getApiKeys({ environment: currentEnvironment! }),
    enabled: !!currentEnvironment?._id,
  });

  return query;
};
