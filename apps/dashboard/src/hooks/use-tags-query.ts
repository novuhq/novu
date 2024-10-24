import { useQuery } from '@tanstack/react-query';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '@/context/environment/hooks';
import { getV2 } from '@/api/api.client';

export const useTagsQuery = () => {
  const { currentEnvironment } = useEnvironment();
  const query = useQuery<{ data: { name: string }[] }>({
    queryKey: [QueryKeys.fetchTags, currentEnvironment?._id],
    queryFn: async () => await getV2(`/environments/${currentEnvironment!._id}/tags`),
    enabled: !!currentEnvironment?._id,
  });

  return query;
};
