import { api } from './api.client';

export async function createLayout(data: any) {
  return api.post(`/v1/layouts`, data);
}

export async function getLayoutById(id: string) {
  return api.get(`/v1/layouts/${id}`);
}

export function getLayoutsList(page = 0, pageSize = 10) {
  return api.getFullResponse(`/v1/layouts`, { page, pageSize });
}
