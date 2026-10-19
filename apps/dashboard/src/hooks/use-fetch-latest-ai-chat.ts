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

  const { data, isPending, error, refetch } = useQuery({
    queryKey: [QueryKeys.fetchChat, currentEnvironment?._id, resourceType, resourceId],
    queryFn: () => fetchLatestChat({ environment: currentEnvironment!, resourceType, resourceId: resourceId! }),
    enabled: !!currentEnvironment && !!resourceType && !!resourceId,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    latestChat: data,
    isPending,
    error,
    refetch,
  };
};
