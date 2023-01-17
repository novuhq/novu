import { api } from './api.client';

export async function createLayout(data: any) {
  return api.post(`/v1/layouts`, data);
}

export async function updateLayoutById(layoutId: string, data: any) {
  return api.patch(`/v1/layouts/${layoutId}`, data);
}

export async function getLayoutById(id: string) {
  return api.get(`/v1/layouts/${id}`);
}

export function getLayoutsList(page = 0, pageSize = 10) {
  return api.getFullResponse(`/v1/layouts`, { page, pageSize });
}

export async function deleteLayoutById(layoutId: string) {
  return api.delete(`/v1/layouts/${layoutId}`);
}
