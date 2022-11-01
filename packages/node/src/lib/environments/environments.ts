import axios from 'axios';
import { WithHttp } from '../novu.interface';
import {
  IEnvironmentCreatePayload,
  IEnvironments,
  IEnvironmentUpdatePayload,
  IWidgetUpdatePayload,
} from './environments.interface';

export class Environments extends WithHttp implements IEnvironments {
  async getCurrent() {
    return await this.http.get('/environments/me');
  }

  async getAll() {
    return await this.http.get('/environments');
  }

  async create(payload: IEnvironmentCreatePayload) {
    return await this.http.post('/environments', payload);
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

  async updateWidget(payload: IWidgetUpdatePayload) {
    return await this.http.put('/environments/widget/settings', payload);
  }
}
