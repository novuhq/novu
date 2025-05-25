import { getTopic } from '@/api/topics';
import { useEnvironment } from '@/context/environment/hooks';
import { useQuery } from '@tanstack/react-query';

export function useTopic(topicKey: string) {
  const { currentEnvironment } = useEnvironment();

  return useQuery({
    queryKey: ['topic', currentEnvironment?._id, topicKey],
    queryFn: () => getTopic({ environment: currentEnvironment!, topicKey }),
    enabled: !!currentEnvironment && !!topicKey,
    retry: 0,
  });
}
