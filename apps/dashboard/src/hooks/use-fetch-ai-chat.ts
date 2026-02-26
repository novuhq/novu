import { useQuery } from '@tanstack/react-query';
import { useEnvironment } from '@/context/environment/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { fetchChat } from '../api/ai';

export const useFetchAiChat = ({ id }: { id?: string }) => {
  const { currentEnvironment } = useEnvironment();

  const { data, isPending, error } = useQuery({
    queryKey: [QueryKeys.fetchChat, currentEnvironment?._id, id],
    queryFn: () => fetchChat({ environment: currentEnvironment!, id: id! }),
    enabled: !!currentEnvironment && !!id,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  return {
    chat: data,
    isPending,
    error,
  };
};
