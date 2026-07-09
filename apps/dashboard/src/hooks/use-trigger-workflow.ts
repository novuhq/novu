import { IEnvironment } from '@novu/shared';
import { useMutation } from '@tanstack/react-query';
import { triggerWorkflow } from '@/api/workflows';
import { useEnvironment } from '../context/environment/hooks';
import { useLocalMode } from '../context/local-mode';

export const useTriggerWorkflow = (environmentHint?: IEnvironment) => {
  const { currentEnvironment } = useEnvironment();
  const { isLocalRoute, bridgeUrl, controlOverrides } = useLocalMode();

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
    }) => {
      // In local mode the workflow may not be synced; the worker resolves it
      // statelessly from the developer's tunnel instead of the database, and
      // sandbox-edited control values ride along job-scoped (the trigger
      // identifier is the workflowId for virtual workflows).
      const isLocalTrigger = isLocalRoute && Boolean(bridgeUrl);
      const stepOverrides = isLocalTrigger ? controlOverrides[name] : undefined;

      return triggerWorkflow({
        environment: environmentHint ?? currentEnvironment ?? ({} as IEnvironment),
        name,
        to,
        payload,
        context,
        ...(isLocalTrigger ? { bridgeUrl: bridgeUrl as string } : {}),
        ...(stepOverrides && Object.keys(stepOverrides).length > 0 ? { controls: { steps: stepOverrides } } : {}),
      });
    },
  });

  return {
    triggerWorkflow: mutateAsync,
    isPending,
    error,
    data,
  };
};
