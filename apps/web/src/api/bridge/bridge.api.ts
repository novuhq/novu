import { bridgeHttp } from './bridge.http';

export const bridgeApi = {
  async discover(): Promise<{ workflows: any[] }> {
    return bridgeHttp.get('', {
      action: 'discover',
    });
  },

  async getWorkflow(workflowId: string): Promise<any> {
    const { workflows } = await this.discover();

    return workflows.find((workflow) => workflow.workflowId === workflowId);
  },

  async getStepPreview(workflowId: string, stepId: string): Promise<any> {
    return bridgeHttp.post('?action=preview&workflowId=' + workflowId + '&stepId=' + stepId, {
      inputs: {},
      data: {},
    });
  },
};
