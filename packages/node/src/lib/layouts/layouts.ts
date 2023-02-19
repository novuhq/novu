import { AxiosInstance } from 'axios';

import { LayoutDto, LayoutId } from './layout.interface';

import {
  ILayoutPaginationPayload,
  ILayoutPaginationResponse,
  ILayoutPayload,
  ILayoutUpdatePayload,
  ILayouts,
} from './layout.interface';

import { WithHttp } from '../novu.interface';

export class Layouts extends WithHttp implements ILayouts {
  async list(
    data: ILayoutPaginationPayload
  ): Promise<ILayoutPaginationResponse> {
    return await this.http.get(`/layouts`, {
      params: {
        page: data.page,
        ...(data?.pageSize && { pageSize: data.pageSize }),
        ...(data?.sortBy && { sortBy: data.sortBy }),
        ...(data?.orderBy && { orderBy: data.orderBy }),
      },
    });
  }

  async get(layoutId: LayoutId): Promise<LayoutDto> {
    return await this.http.get(`/layouts`, {
      params: {
        layoutId,
      },
    });
  }

  async create(data: ILayoutPayload): Promise<Pick<LayoutDto, '_id'>> {
    return await this.http.post(`/layouts`, {
      name: data.name,
      description: data.description,
      content: data.content,
      variables: data.variables,
      isDefault: data.isDefault,
    });
  }

  async update(
    layoutId: LayoutId,
    data: ILayoutUpdatePayload
  ): Promise<LayoutDto> {
    return await this.http.patch(`/layouts/${layoutId}`, {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.content && { content: data.content }),
      ...(data.variables && { variables: data.variables }),
      ...(typeof data.isDefault === 'boolean' && { isDefault: data.isDefault }),
    });
  }

  async delete(layoutId: LayoutId): Promise<void> {
    return await this.http.delete(`/layouts/${layoutId}`);
  }

  async setDefault(layoutId: LayoutId): Promise<void> {
    return await this.http.post(`/layouts/${layoutId}/default`);
  }
}
