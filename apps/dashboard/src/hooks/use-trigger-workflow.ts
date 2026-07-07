import { IEnvironment } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { triggerWorkflow } from '@/api/workflows';
import { useEnvironment } from '../context/environment/hooks';
import { useLocalMode } from '../context/local-mode';

export const useTriggerWorkflow = (environmentHint?: IEnvironment) => {
  const { currentEnvironment } = useEnvironment();
  const { isLocalRoute, bridgeUrl } = useLocalMode();

  const { mutateAsync, isPending, error, data } = useMutation({
    mutationFn: async ({
      name,
      to,
      payload,
      context,
    }: {
      name: string;
      to: unknown;
      payload: unknown;
      context?: unknown;
    }) =>
      triggerWorkflow({
        environment: environmentHint ?? currentEnvironment ?? ({} as IEnvironment),
        name,
        to,
        payload,
        context,
        // In local mode the workflow may not be synced; the worker resolves it
        // statelessly from the developer's tunnel instead of the database.
        ...(isLocalRoute && bridgeUrl ? { bridgeUrl } : {}),
      }),
  });

  return {
    triggerWorkflow: mutateAsync,
    isPending,
    error,
    data,
  };
};
