import { useMutation } from '@tanstack/react-query';
import { triggerWorkflow } from '@/api/workflows';
import { IEnvironment } from '@novu/shared';
import { useEnvironment } from '../context/environment/hooks';

export const useTriggerWorkflow = (environmentHint?: IEnvironment) => {
  const { currentEnvironment } = useEnvironment();
  const { mutateAsync, isPending, error, data } = useMutation({
    mutationFn: async ({ name, to, payload }: { name: string; to: unknown; payload: unknown }) =>
      triggerWorkflow({ environment: environmentHint ?? currentEnvironment!, name, to, payload }),
  });

  return {
    triggerWorkflow: mutateAsync,
    isPending,
    error,
    data,
  };
};
