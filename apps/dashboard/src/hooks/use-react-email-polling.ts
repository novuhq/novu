import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { QueryKeys } from '@/utils/query-keys';

const POLL_INTERVAL_MS = 3_000;

export function useReactEmailPolling({
  stepResolverHash,
  isReactEmailMode,
}: {
  stepResolverHash?: string | null;
  isReactEmailMode: boolean;
}) {
  const queryClient = useQueryClient();
  const { formState } = useFormContext();
  const prevHashRef = useRef(stepResolverHash);

  useEffect(() => {
    if (!isReactEmailMode) return;

    const interval = setInterval(() => {
      if (formState.isDirty) return;
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isReactEmailMode, queryClient, formState.isDirty]);

  useEffect(() => {
    if (stepResolverHash && stepResolverHash !== prevHashRef.current) {
      if (!formState.isDirty) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.previewStep] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.diffEnvironments] });
        prevHashRef.current = stepResolverHash;
      }
    } else {
      prevHashRef.current = stepResolverHash;
    }
  }, [stepResolverHash, queryClient, formState.isDirty]);
}
