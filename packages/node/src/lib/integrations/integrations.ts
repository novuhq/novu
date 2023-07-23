import {
  IIntegrations,
  IIntegrationsPayload,
  IIntegrationsUpdatePayload,
} from './integrations.interface';
import { Novu } from '../novu';

export class Integrations implements IIntegrations {
  constructor(private readonly novu: Novu) {}

  // TODO: Add pagination options
  async getAll() {
    return await this.novu.get('/integrations');
  }

  // TODO: Add pagination options
  async getActive() {
    return await this.novu.get('/integrations/active');
  }

  /**
   * @param {string} providerId - Id of the provider to get status
   */
  async getWebhookProviderStatus(providerId: string) {
    return await this.novu.get(
      `integrations/webhook/provider/${providerId}/status`
    );
  }

  /**
   * @param {string} providerId - Id of the provider
   * @param {IIntegrationsPayload} data - All the parameters to create an Integration
   */
  async create(providerId: string, data: IIntegrationsPayload) {
    return await this.novu.post(`/integrations`, {
      providerId,
      ...data,
    });
  }

  /**
   * @param {string} integrationId - integrationId of the integration to update
   * @param {IIntegrationsUpdatePayload} data - All the parameters to update an integration
   */
  async update(integrationId: string, data: IIntegrationsUpdatePayload) {
    return await this.novu.put(`/integrations/${integrationId}`, {
      ...data,
    });
  }

  /**
   * @param {string} integrationId - integrationId of the integration to delete
   */
  async delete(integrationId: string) {
    return await this.novu.delete(`/integrations/${integrationId}`);
  }

  async getInAppStatus() {
    return await this.novu.get('/integrations/in-app/status');
  }
}
