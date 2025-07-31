import axios from 'axios';

import type { DiscoverWorkflowOutput, Event, ExecuteOutput, HealthCheck } from '@novu/framework/internal';

export type TriggerParams = {
  workflowId: string;
  bridgeUrl?: string;
  to: { subscriberId: string; email: string };
  payload: Record<string, unknown>;
  controls?: {
    steps?: Record<string, unknown>;
  };
};

export function buildBridgeHTTPClient(baseURL: string) {
  const httpClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
      // Required if a custom tunnel is used by developers such as localtunnel.it
      'Bypass-Tunnel-Reminder': true,
    },
  });

  const get = async (url, params = {}) => {
    try {
      const response = await httpClient.get(url, { params });

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  // POST method
  const post = async (url, data = {}) => {
    try {
      const response = await httpClient.post(url, data);

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  return {
    async discover(): Promise<{ workflows: DiscoverWorkflowOutput[] }> {
      return get('', {
        action: 'discover',
      });
    },

    async healthCheck(): Promise<HealthCheck> {
      return get('', {
        action: 'health-check',
      });
    },

    /**
     * TODO: Use framework shared types
     */
    async getWorkflow(workflowId: string): Promise<DiscoverWorkflowOutput | undefined> {
      const { workflows } = await this.discover();

      return workflows.find((workflow) => workflow.workflowId === workflowId);
    },

    /**
     * TODO: Use framework shared types
     */
    async getStepPreview({
      workflowId,
      stepId,
      controls,
      payload,
      state,
      subscriber,
    }: Omit<Event, 'action'>): Promise<ExecuteOutput> {
      return post(`${baseURL}?action=preview&workflowId=${workflowId}&stepId=${stepId}`, {
        controls: controls || {},
        payload: payload || {},
        state: state || [],
        subscriber: subscriber || {},
      });
    },

    /**
     * TODO: Use framework shared types
     */
    async trigger({ workflowId, bridgeUrl, to, payload, controls }: TriggerParams): Promise<any> {
      payload = payload || {};
      payload.__source = 'studio-test-workflow';

      return post(`${baseURL}?action=trigger&workflowId=${workflowId}`, {
        bridgeUrl,
        to,
        payload,
        controls,
      });
    },
  };
}
