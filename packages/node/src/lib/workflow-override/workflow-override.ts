import {
  IWorkflowOverridePayload,
  IWorkflowOverrides,
  IWorkflowOverrideUpdatePayload,
} from './workflow-override.interface';
import { WithHttp } from '../novu.interface';

export class WorkflowOverrides extends WithHttp implements IWorkflowOverrides {
  /**
   * @param {string} overrideId - overrideId of the workflow-override to update
   * @param {IWorkflowOverrideUpdatePayload} data - All the additional parameters to update a workflow-override
   */
  async updateOneById(
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
  async getOneById(overrideId: string) {
    return await this.http.get(`/workflow-overrides/${overrideId}`);
  }

  /**
   * @param {number} page - Page number to fetch
   * @param {number} limit - Number of results to fetch in one page
   */
  async list(page = 0, limit = 10) {
    return await this.http.get(`/workflow-overrides`, {
      params: { page, limit },
    });
  }

  /**
   * @param {string} workflowId - workflowId
   * @param {string} tenantId - tenantId
   */
  async getOneByTenantIdandWorkflowId(workflowId: string, tenantId: string) {
    return await this.http.get(
      `/workflow-overrides/workflows/${workflowId}/tenants/${tenantId}`
    );
  }

  /**
   * @param {string} workflowId - workflowId
   * @param {string} tenantId - tenantId
   * @param {IWorkflowOverrideUpdatePayload} data - All the additional parameters to update workflow override
   */
  async updateOneByTenantIdandWorkflowId(
    workflowId: string,
    tenantId: string,
    data: IWorkflowOverrideUpdatePayload
  ) {
    return await this.http.put(
      `/workflow-overrides/workflows/${workflowId}/tenants/${tenantId}`,
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
