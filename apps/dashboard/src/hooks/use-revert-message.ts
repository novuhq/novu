import { useMutation } from '@tanstack/react-query';
import { revertMessage } from '@/api/ai';
import { useEnvironment } from '@/context/environment/hooks';

export function useRevertMessage() {
  const { currentEnvironment } = useEnvironment();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: async ({
      chatId,
      messageId,
      type,
    }: {
      chatId: string;
      messageId: string;
      type: 'revert' | 'try-again';
    }) => {
      return revertMessage({ environment: currentEnvironment!, chatId, messageId, type });
    },
  });

  return {
    revertMessage: mutateAsync,
    isPending,
    error,
  };
}
