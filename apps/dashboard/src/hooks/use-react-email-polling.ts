import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { QueryKeys } from '@/utils/query-keys';

const POLL_INTERVAL_MS = 3_000;

export function useReactEmailPolling() {
  const queryClient = useQueryClient();
  const { control } = useFormContext();
  const rendererType = useWatch({ name: 'rendererType', control });

  useEffect(() => {
    if (rendererType !== 'react-email') return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchWorkflow] });
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [rendererType, queryClient]);
}
