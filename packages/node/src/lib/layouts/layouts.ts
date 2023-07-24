import { LayoutId } from './layout.interface';
import {
  ILayoutPaginationPayload,
  ILayoutPayload,
  ILayoutUpdatePayload,
  ILayouts,
} from './layout.interface';
import { WithHttp } from '../novu.interface';

export class Layouts extends WithHttp implements ILayouts {
  async create(data: ILayoutPayload) {
    return await this.postRequest(`/layouts`, {
      name: data.name,
      description: data.description,
      content: data.content,
      variables: data.variables,
      isDefault: data.isDefault,
    });
  }

  async list(data?: ILayoutPaginationPayload) {
    return await this.getRequest(`/layouts`, {
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
    return await this.getRequest(`/layouts`, {
      params: {
        layoutId,
      },
    });
  }

  async delete(layoutId: LayoutId) {
    return await this.deleteRequest(`/layouts/${layoutId}`);
  }

  async update(layoutId: LayoutId, data: ILayoutUpdatePayload) {
    return await this.patchRequest(`/layouts/${layoutId}`, {
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
    return await this.postRequest(`/layouts/${layoutId}/default`);
  }
}
