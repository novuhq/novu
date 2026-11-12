import { AiResourceTypeEnum } from '@novu/shared';
import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { fetchLatestChat } from '../api/ai';

export const useFetchLatestAiChat = ({
  resourceType,
  resourceId,
}: {
  resourceType: AiResourceTypeEnum;
  resourceId?: string;
}) => {
  const { currentEnvironment } = useEnvironment();

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: [QueryKeys.fetchChat, currentEnvironment?._id, resourceType, resourceId],
    queryFn: () => {
      if (!currentEnvironment || !resourceId) throw new Error('The latest chat needs an environment and a resource');

      return fetchLatestChat({ environment: currentEnvironment, resourceType, resourceId });
    },
    enabled: !!currentEnvironment && !!resourceType && !!resourceId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    latestChat: data,
    isPending,
    isFetching,
    error,
    refetch,
  };
};
