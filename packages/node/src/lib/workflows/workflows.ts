import { IWorkflowPayload, IWorkflows } from './workflow.interface';
import { Novu } from '../novu';

export class Workflows implements IWorkflows {
  constructor(private readonly novu: Novu) {}

  /**
   * @param {number} page - Page number to fetch
   * @param {number} limit - Number of results to fetch in one page
   */
  async list(page = 0, limit = 10) {
    return await this.novu.get(`/workflows`, {
      params: { page, limit },
    });
  }

  /**
   * @param {IWorkflowPayload} data - All the additional parameters to create a workflow
   */
  async create(data: IWorkflowPayload) {
    return await this.novu.post(`/workflows`, {
      ...data,
    });
  }

  /**
   * @param {string} workflowId - workflowId of the workflow to update
   * @param {IWorkflowPayload} data - All the additional parameters to update a workflow
   */
  async update(workflowId: string, data: IWorkflowPayload) {
    return await this.novu.put(`/workflows/${workflowId}`, {
      ...data,
    });
  }

  /**
   * @param {string} workflowId - workflowId of the workflow to delete
   */
  async delete(workflowId: string) {
    return await this.novu.delete(`/workflows/${workflowId}`);
  }

  /**
   * @param {string} workflowId - workflowId of the workflow to get details of
   */
  async get(workflowId: string) {
    return await this.novu.get(`/workflows/${workflowId}`);
  }

  /**
   * @param {string} workflowId - workflowId of the workflow to update status
   * @param {boolean} active - status of the workflow
   */
  async updateStatus(workflowId: string, active: boolean) {
    return await this.novu.put(`/workflows/${workflowId}/status`, {
      active,
    });
  }
}
