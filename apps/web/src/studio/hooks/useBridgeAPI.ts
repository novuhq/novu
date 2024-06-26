import { useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { buildBridgeHTTPClient, type StepPreviewParams, type TriggerParams } from '../../bridgeApi/bridgeApi.client';
import { useBridgeURL } from './useBridgeURL';
import { useStudioState } from '../StudioStateProvider';

function useBridgeAPI() {
  const bridgeURL = useBridgeURL();

  return useMemo(() => buildBridgeHTTPClient(bridgeURL), [bridgeURL]);
}

export const useDiscover = (options?: any) => {
  const api = useBridgeAPI();

  return useQuery(
    ['bridge-workflows'],
    async () => {
      return api.discover();
    },
    options
  );
};

export const useWorkflow = (templateId: string, options?: any) => {
  const api = useBridgeAPI();

  return useQuery(
    ['workflow', templateId],
    async () => {
      return api.getWorkflow(templateId);
    },
    options
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
    options
  );
};

export const useWorkflowTrigger = () => {
  const api = useBridgeAPI();
  const state = useStudioState();

  const { mutateAsync, ...rest } = useMutation(api.trigger);

  const bridgeUrl = state.local ? state.tunnelBridgeURL : state.storedBridgeURL;

  async function trigger(params: TriggerParams) {
    return mutateAsync({ ...params, bridgeUrl });
  }

  return {
    ...rest,
    mutateAsync,
    trigger,
  };
};
