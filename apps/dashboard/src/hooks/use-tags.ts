import { getTags } from '@/api/environments';
import { QueryKeys } from '@/utils/query-keys';
import { useEnvironment } from '@/context/environment/hooks';
import { useQuery } from '@tanstack/react-query';
import type { ITagsResponse } from '@novu/shared';

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
