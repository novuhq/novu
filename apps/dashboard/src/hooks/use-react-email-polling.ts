import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { QueryKeys } from '@/utils/query-keys';

const POLL_INTERVAL_MS = 3_000;

export function useReactEmailPolling({ stepResolverHash }: { stepResolverHash?: string | null }) {
  const queryClient = useQueryClient();
  const { control, formState } = useFormContext();
  const rendererType = useWatch({ name: 'rendererType', control });
  const prevHashRef = useRef(stepResolverHash);

  useEffect(() => {
    if (rendererType !== 'react-email') return;

    const interval = setInterval(() => {
      if (formState.isDirty) return;
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [rendererType, queryClient, formState.isDirty]);

  useEffect(() => {
    if (stepResolverHash && stepResolverHash !== prevHashRef.current) {
      if (formState.isDirty || rendererType !== 'react-email') return;

      queryClient.invalidateQueries({ queryKey: [QueryKeys.previewStep] });
      queryClient.invalidateQueries({ queryKey: [QueryKeys.diffEnvironments] });
    }

    prevHashRef.current = stepResolverHash;
  }, [stepResolverHash, queryClient, formState.isDirty, rendererType]);
}
