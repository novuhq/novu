import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { useFormContext } from 'react-hook-form';
import { QueryKeys } from '@/utils/query-keys';

const POLL_INTERVAL_MS = 3_000;

export function useStepResolverPolling({
  enabled,
  stepResolverHash,
  onHashChange,
}: {
  enabled: boolean;
  stepResolverHash?: string | null;
  onHashChange?: () => void;
}) {
  const queryClient = useQueryClient();
  const { formState } = useFormContext();
  const prevHashRef = useRef(stepResolverHash);
  const onHashChangeRef = useRef(onHashChange);
  onHashChangeRef.current = onHashChange;

  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      if (formState.isDirty) return;
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [enabled, queryClient, formState.isDirty]);

  useEffect(() => {
    if (stepResolverHash && stepResolverHash !== prevHashRef.current) {
      if (!formState.isDirty) {
        queryClient.invalidateQueries({ queryKey: [QueryKeys.previewStep] });
        queryClient.invalidateQueries({ queryKey: [QueryKeys.diffEnvironments] });
        prevHashRef.current = stepResolverHash;
        onHashChangeRef.current?.();
      }
    } else {
      prevHashRef.current = stepResolverHash;
    }
  }, [stepResolverHash, queryClient, formState.isDirty]);
}
