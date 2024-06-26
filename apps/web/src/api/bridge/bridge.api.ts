import { bridgeHttp } from './bridge.http';

export const bridgeApi = {
  /**
   * TODO: Use framework shared types
   */
  async discover(): Promise<{ workflows: any[] }> {
    return bridgeHttp.get('', {
      action: 'discover',
    });
  },

  /**
   * TODO: Use framework shared types
   */
  async getWorkflow(workflowId: string): Promise<any> {
    const { workflows } = await this.discover();

    return workflows.find((workflow) => workflow.workflowId === workflowId);
  },

  /**
   * TODO: Use framework shared types
   */
  async getStepPreview(
    workflowId: string,
    stepId: string,
    payload: Record<string, unknown>,
    controls: Record<string, unknown>
  ): Promise<any> {
    return bridgeHttp.post('?action=preview&workflowId=' + workflowId + '&stepId=' + stepId, {
      inputs: controls || {},
      controls: controls || {},
      data: payload || {},
    });
  },
};
