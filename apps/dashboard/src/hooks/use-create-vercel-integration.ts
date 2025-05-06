import { useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';

import { useVercelParams } from './use-vercel-params';
import { createVercelIntegration } from '../api/partner-integrations';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { useDataRef } from './use-data-ref';
import { useEnvironment } from '@/context/environment/hooks';

export function useCreateVercelIntegration() {
  const { currentEnvironment } = useEnvironment();
  const params = useVercelParams();
  const dataRef = useDataRef({
    code: params.code,
    configurationId: params.configurationId,
    isFromVercel: params.isFromVercel,
  });

  const { mutateAsync, isPending, data } = useMutation({
    mutationFn: async (payload: { code: string; configurationId: string }) => {
      const response = await createVercelIntegration({ ...payload, environment: currentEnvironment });

      return response.data;
    },
    onError: (err: any) => {
      if (err?.message) {
        showErrorToast(`Failed to start Vercel integration setup: ${err?.message}`);
      }
    },
  });

  const startVercelSetup = useCallback(async () => {
    const { code, configurationId, isFromVercel } = dataRef.current;

    if (!isFromVercel || !code || !configurationId) {
      return;
    }

    await mutateAsync({ code, configurationId });
  }, [dataRef, mutateAsync]);

  useEffect(() => {
    if (!currentEnvironment) {
      return;
    }

    startVercelSetup();
  }, [currentEnvironment, startVercelSetup]);

  return {
    isPending,
    data,
  };
}
