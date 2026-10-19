import type { ITagsResponse } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { getTags } from '@/api/environments';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';

export const useTags = () => {
  const { currentEnvironment } = useEnvironment();
  const { data: tags, ...query } = useQuery<ITagsResponse>({
    queryKey: [QueryKeys.fetchTags, currentEnvironment?._id],
    queryFn: () => getTags({ environment: currentEnvironment! }),
    enabled: !!currentEnvironment?._id,
    initialData: [],
  });

  return {
    tags,
    ...query,
  };
};
