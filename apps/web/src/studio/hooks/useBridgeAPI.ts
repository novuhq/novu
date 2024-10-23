import { useEffect, useMemo } from 'react';
import { useMutation, useQuery, UseQueryResult } from '@tanstack/react-query';
import type { DiscoverWorkflowOutput } from '@novu/framework/internal';
import {
  buildBridgeHTTPClient,
  type StepPreviewParams,
  type TriggerParams,
  type BridgeStatus,
} from '../../bridgeApi/bridgeApi.client';
import { useStudioState } from '../StudioStateProvider';
import { api as cloudApi } from '../../api';

export function useBridgeAPI() {
  const { bridgeURL } = useStudioState();

  return useMemo(() => buildBridgeHTTPClient(bridgeURL), [bridgeURL]);
}

const BRIDGE_STATUS_REFRESH_INTERVAL_IN_MS = 5 * 1000;

export const useDiscover = (options?: any) => {
  const { bridgeURL, setBridgeURL } = useStudioState();
  const api = useBridgeAPI();

  const discoverQuery = useQuery(
    ['bridge-workflows'],
    async () => {
      return api.discover();
    },
    {
      refetchOnWindowFocus: true,
      ...(options || {}),
    }
  );
  const { refetch } = discoverQuery;

  useEffect(() => {
    if (!bridgeURL) {
      refetch();
    }
  }, [bridgeURL, setBridgeURL, refetch]);

  return discoverQuery;
};

export const useHealthCheck = (options?: any) => {
  const bridgeAPI = useBridgeAPI();
  const { bridgeURL, isLocalStudio } = useStudioState();

  const res = useQuery<BridgeStatus>(
    ['bridge-health-check', bridgeURL],
    async () => {
      if (isLocalStudio) {
        return await bridgeAPI.healthCheck();
      } else {
        return await cloudApi.get('/v1/bridge/status');
      }
    },
    {
      enabled: !!bridgeURL,
      networkMode: 'always',
      refetchOnWindowFocus: true,
      refetchInterval: BRIDGE_STATUS_REFRESH_INTERVAL_IN_MS,
      ...options,
    }
  );

  return {
    ...res,
    bridgeURL,
  };
};

export const useWorkflow = (templateId: string, options?: any): UseQueryResult<DiscoverWorkflowOutput, unknown> => {
  const api = useBridgeAPI();

  return useQuery(
    ['workflow', templateId],
    async () => {
      return api.getWorkflow(templateId);
    },
    {
      refetchOnWindowFocus: true,
      ...(options || {}),
    }
  );
};

export const useWorkflowPreview = (
  { workflowId, stepId, controls = {}, payload = {} }: StepPreviewParams,
  options?: any
) => {
  const api = useBridgeAPI();

  return useQuery(
    ['workflow-preview', workflowId, stepId, controls, payload],
    async () => {
      return api.getStepPreview({ workflowId, stepId, payload, controls });
    },
    {
      refetchOnWindowFocus: true,
      ...(options || {}),
    }
  );
};

export const useWorkflowTrigger = () => {
  const api = useBridgeAPI();
  const state = useStudioState();

  const { mutateAsync, ...rest } = useMutation(api.trigger);

  const bridgeUrl = state.isLocalStudio ? state.tunnelBridgeURL : state.storedBridgeURL;

  async function trigger(params: TriggerParams): Promise<{ data: { transactionId: string } }> {
    return mutateAsync({ ...params, bridgeUrl });
  }

  return {
    ...rest,
    mutateAsync,
    trigger,
  };
};
