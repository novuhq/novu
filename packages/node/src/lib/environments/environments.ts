import {
  IEnvironmentCreatePayload,
  IEnvironments,
  IEnvironmentUpdatePayload,
} from './environments.interface';
import { WithHttp } from '../novu.interface';

export class Environments extends WithHttp implements IEnvironments {
  async getCurrent() {
    return await this.getRequest('/environments/me');
  }

  async create(payload: IEnvironmentCreatePayload) {
    return await this.postRequest('/environments', payload);
  }

  // TODO: Add pagination options
  async getAll() {
    return await this.getRequest('/environments');
  }

  async updateOne(id: string, payload: IEnvironmentUpdatePayload) {
    return await this.putRequest(`/environments/${id}`, payload);
  }

  async getApiKeys() {
    return await this.getRequest('/environments/api-keys');
  }

  async regenerateApiKeys() {
    return await this.postRequest('/environments/api-keys/regenerate');
  }
}
