import {
  IIntegrations,
  IIntegrationsPayload,
  IIntegrationsUpdatePayload,
} from './integrations.interface';
import { WithHttp } from '../novu.interface';

export class Integrations extends WithHttp implements IIntegrations {
  // TODO: Add pagination options
  async getAll() {
    return await this.getRequest('/integrations');
  }

  // TODO: Add pagination options
  async getActive() {
    return await this.getRequest('/integrations/active');
  }

  /**
   * @param {string} providerId - Id of the provider to get status
   */
  async getWebhookProviderStatus(providerId: string) {
    return await this.getRequest(
      `integrations/webhook/provider/${providerId}/status`
    );
  }

  /**
   * @param {string} providerId - Id of the provider
   * @param {IIntegrationsPayload} data - All the parameters to create an Integration
   */
  async create(providerId: string, data: IIntegrationsPayload) {
    return await this.postRequest(`/integrations`, {
      providerId,
      ...data,
    });
  }

  /**
   * @param {string} integrationId - integrationId of the integration to update
   * @param {IIntegrationsUpdatePayload} data - All the parameters to update an integration
   */
  async update(integrationId: string, data: IIntegrationsUpdatePayload) {
    return await this.putRequest(`/integrations/${integrationId}`, {
      ...data,
    });
  }

  /**
   * @param {string} integrationId - integrationId of the integration to delete
   */
  async delete(integrationId: string) {
    return await this.deleteRequest(`/integrations/${integrationId}`);
  }

  async getInAppStatus() {
    return await this.getRequest('/integrations/in-app/status');
  }
}
