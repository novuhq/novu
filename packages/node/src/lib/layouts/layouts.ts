import { LayoutId } from './layout.interface';
import {
  ILayoutPaginationPayload,
  ILayoutPayload,
  ILayoutUpdatePayload,
  ILayouts,
} from './layout.interface';
import { Novu } from '../novu';

export class Layouts implements ILayouts {
  constructor(private readonly novu: Novu) {}

  async create(data: ILayoutPayload) {
    return await this.novu.post(`/layouts`, {
      name: data.name,
      description: data.description,
      content: data.content,
      variables: data.variables,
      isDefault: data.isDefault,
    });
  }

  async list(data?: ILayoutPaginationPayload) {
    return await this.novu.get(`/layouts`, {
      params: {
        // handle page = 0 by toString()
        ...(data?.page?.toString() && { page: data.page }),
        ...(data?.pageSize && { pageSize: data.pageSize }),
        ...(data?.sortBy && { sortBy: data.sortBy }),
        ...(data?.orderBy && { orderBy: data.orderBy }),
      },
    });
  }

  async get(layoutId: LayoutId) {
    return await this.novu.get(`/layouts`, {
      params: {
        layoutId,
      },
    });
  }

  async delete(layoutId: LayoutId) {
    return await this.novu.delete(`/layouts/${layoutId}`);
  }

  async update(layoutId: LayoutId, data: ILayoutUpdatePayload) {
    return await this.novu.patch(`/layouts/${layoutId}`, {
      ...(data.name && { name: data.name }),
      ...(data.description && { description: data.description }),
      ...(data.content && { content: data.content }),
      ...(data.variables && { variables: data.variables }),
      ...(typeof data.isDefault === 'boolean' && {
        isDefault: data.isDefault,
      }),
    });
  }

  async setDefault(layoutId: LayoutId) {
    return await this.novu.post(`/layouts/${layoutId}/default`);
  }
}
