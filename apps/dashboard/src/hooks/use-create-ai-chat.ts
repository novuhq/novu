import { AiResourceTypeEnum } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { createAiChat } from '@/api/ai';
import { useEnvironment } from '@/context/environment/hooks';

export function useCreateAiChat() {
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, isPending, error, data } = useMutation({
    mutationFn: async ({ resourceType, resourceId }: { resourceType: AiResourceTypeEnum; resourceId?: string }) => {
      return createAiChat({ environment: currentEnvironment!, resourceType, resourceId });
    },
  });

  return {
    createAiChat: mutateAsync,
    isPending,
    error,
    data,
  };
}
