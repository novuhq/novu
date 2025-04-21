import { getTopic } from '@/api/topics';
import { useEnvController } from '@/hooks/use-env-controller';
import { useQuery } from '@tanstack/react-query';

export function useTopic(topicKey: string) {
  const { environment } = useEnvController();

  return useQuery({
    queryKey: ['topic', environment?._id, topicKey],
    queryFn: () => getTopic({ environment: environment!, topicKey }),
    enabled: !!environment && !!topicKey,
  });
}
