import { ChannelTypeEnum } from '@novu/shared';
import { WithHttp } from '../novu.interface';
import {
  IIntegrations,
  IIntegrationsPayload,
  IIntegrationsUpdatePayload,
} from './integrations.interface';

export class Integrations extends WithHttp implements IIntegrations {
  async getAll() {
    return await this.http.get('/integrations');
  }

  async getActive() {
    return await this.http.get('/integrations/active');
  }

  async getInAppStatus() {
    return await this.http.get('/integrations/in-app/status');
  }

  /**
   * @param {string} providerId - Id of the provider to get status
   */
  async getWebhookProviderStatus(providerId: string) {
    return await this.http.get(
      `integrations/webhook/provider/${providerId}/status`
    );
  }

  /**
   * @param {string} providerId - Id of the provider
   * @param {IIntegrationsPayload} data - All the parameters to create an Integration
   */
  async create(providerId: string, data: IIntegrationsPayload) {
    return await this.http.post(`/integrations`, {
      providerId,
      ...data,
    });
  }

  /**
   * @param {string} integrationId - integrationId of the integration to update
   * @param {IIntegrationsUpdatePayload} data - All the parameters to update an integration
   */
  async update(integrationId: string, data: IIntegrationsUpdatePayload) {
    return await this.http.put(`/integrations/${integrationId}`, {
      ...data,
    });
  }

  /**
   * @param {string} integrationId - integrationId of the integration to set it as primary
   */
  async setIntegrationAsPrimary(integrationId: string) {
    return await this.http.post(
      `/integrations/${integrationId}/set-primary`,
      {}
    );
  }

  /**
   * @param {string} integrationId - integrationId of the integration to delete
   */
  async delete(integrationId: string) {
    return await this.http.delete(`/integrations/${integrationId}`);
  }
}
