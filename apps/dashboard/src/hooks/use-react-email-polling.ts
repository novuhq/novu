import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { QueryKeys } from '@/utils/query-keys';

const POLL_INTERVAL_MS = 3_000;

export function useReactEmailPolling({ stepResolverHash }: { stepResolverHash?: string | null }) {
  const queryClient = useQueryClient();
  const { formState } = useFormContext();
  const prevHashRef = useRef(stepResolverHash);

  useEffect(() => {
    const interval = setInterval(() => {
      if (formState.isDirty) return;
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [queryClient, formState.isDirty]);

  useEffect(() => {
    if (stepResolverHash && stepResolverHash !== prevHashRef.current) {
      if (!formState.isDirty) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.previewStep] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.diffEnvironments] });
      }
    }

    prevHashRef.current = stepResolverHash;
  }, [stepResolverHash, queryClient, formState.isDirty]);
}
