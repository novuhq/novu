import { TenantIdentifier } from '@novu/shared';
import {
  ITenants,
  ITenantPayload,
  ITenantUpdatePayload,
  ITenantPaginationPayload,
} from './tenant.interface';
import { WithHttp } from '../novu.interface';

const BASE_PATH = '/tenants';

export class Tenants extends WithHttp implements ITenants {
  async create(identifier: TenantIdentifier, data: ITenantPayload) {
    return await this.http.post(BASE_PATH, {
      identifier,
      ...data,
    });
  }

  async update(identifier: TenantIdentifier, data: ITenantUpdatePayload) {
    return await this.http.patch(`${BASE_PATH}/${identifier}`, {
      ...data,
    });
  }

  async list(data: ITenantPaginationPayload) {
    return await this.http.get(BASE_PATH, {
      params: {
        // handle page = 0 by toString()
        ...(data?.page?.toString() && { page: data.page }),
        ...(data?.limit && { limit: data.limit }),
      },
    });
  }

  async delete(identifier: TenantIdentifier) {
    return await this.http.delete(`${BASE_PATH}/${identifier}`);
  }

  async get(identifier: TenantIdentifier) {
    return await this.http.get(`${BASE_PATH}/${identifier}`);
  }
}
