import {
  IEnvironmentCreatePayload,
  IEnvironments,
  IEnvironmentUpdatePayload,
} from './environments.interface';
import { Novu } from '../novu';

export class Environments implements IEnvironments {
  constructor(private readonly novu: Novu) {}
  async getCurrent() {
    return await this.novu.get('/environments/me');
  }

  async create(payload: IEnvironmentCreatePayload) {
    return await this.novu.post('/environments', payload);
  }

  // TODO: Add pagination options
  async getAll() {
    return await this.novu.get('/environments');
  }

  async updateOne(id: string, payload: IEnvironmentUpdatePayload) {
    return await this.novu.put(`/environments/${id}`, payload);
  }

  async getApiKeys() {
    return await this.novu.get('/environments/api-keys');
  }

  async regenerateApiKeys() {
    return await this.novu.post('/environments/api-keys/regenerate');
  }
}
