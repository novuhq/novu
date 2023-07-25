import {
  IEnvironmentCreatePayload,
  IEnvironments,
  IEnvironmentUpdatePayload,
} from './environments.interface';
import { WithHttp } from '../novu.interface';

export class Environments extends WithHttp implements IEnvironments {
  async getCurrent() {
    return await this.http.get('/environments/me');
  }

  async create(payload: IEnvironmentCreatePayload) {
    return await this.http.post('/environments', payload);
  }

  async getAll() {
    return await this.http.get('/environments');
  }

  async updateOne(id: string, payload: IEnvironmentUpdatePayload) {
    return await this.http.put(`/environments/${id}`, payload);
  }

  async getApiKeys() {
    return await this.http.get('/environments/api-keys');
  }

  async regenerateApiKeys() {
    return await this.http.post('/environments/api-keys/regenerate');
  }
}
