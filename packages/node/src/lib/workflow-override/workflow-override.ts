import {
  IWorkflowOverridePayload,
  IWorkflowOverrides,
  IWorkflowOverrideUpdatePayload,
} from './workflow-override.interface';
import { WithHttp } from '../novu.interface';

export class WorkflowOverrides extends WithHttp implements IWorkflowOverrides {
  /**
   * @param {string} overrideId - overrideId of the workflow-override to update
   * @param {IWorkflowOverrideUpdatePayload} data - All the additional parameters to update a worflow-override
   */
  async updateWorkflowOverrideById(
    overrideId: string,
    data: IWorkflowOverrideUpdatePayload
  ) {
    return await this.http.put(`/workflow-overrides/${overrideId}`, {
      ...data,
    });
  }

  /**
   * @param {IWorkflowOverridePayload} data - All the additional parameters to create a workflow-override
   */
  async create(data: IWorkflowOverridePayload) {
    return await this.http.post(`/workflow-overrides`, {
      ...data,
    });
  }

  /**
   * @param {string} overrideId - overrideId of the workflow
   */
  async getworkflowOverrideById(overrideId: string) {
    return await this.http.get(`/workflow-overrides/${overrideId}`);
  }

  /**
   * @param {number} page - Page number to fetch
   * @param {number} limit - Number of results to fetch in one page
   */
  async getWorkflowOverrides(page = 0, limit = 10) {
    return await this.http.get(`/workflow-overrides`, {
      params: { page, limit },
    });
  }

  /**
   * @param {string} workflowId - workflowId
   * @param {string} tenantId - tenantId
   */
  async getWorkflowOverrideByTenant(workflowId: string, tenantId: string) {
    return await this.http.get(
      `/workflow-overrides/workflows/${workflowId}/tenants/${tenantId}`
    );
  }

  /**
   * @param {string} overrideId - workflowId
   * @param {string} tenantId - tenantId
   * @param {IWorkflowOverrideUpdatePayload} data - All the additional paramters to update workflow override
   */
  async updateWorkflowOverride(
    workflowId: string,
    tenantId: string,
    data: IWorkflowOverrideUpdatePayload
  ) {
    return await this.http.put(
      `/workflow-overrides/workflows/${overrideId}/tenants/${tenantId}`,
      {
        ...data,
      }
    );
  }

  /**
   *
   * @param {string} overrideId - overrideID of the workflow
   */
  async delete(overrideId: string) {
    return await this.http.delete(`/workflow-overrides/${overrideId}`);
  }
}
