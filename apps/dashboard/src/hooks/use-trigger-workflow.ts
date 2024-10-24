import { useMutation } from '@tanstack/react-query';
import { triggerWorkflow } from '@/api/workflows';

export const useTriggerWorkflow = () => {
  const { mutateAsync, isPending, error, data } = useMutation({
    mutationFn: async ({ name, to, payload }: { name: string; to: unknown; payload: unknown }) =>
      triggerWorkflow({ name, to, payload }),
  });

  return {
    triggerWorkflow: mutateAsync,
    isPending,
    error,
    data,
  };
};
