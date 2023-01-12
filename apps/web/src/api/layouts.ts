import { api } from './api.client';

export async function createLayout(data: any) {
  return api.post(`/v1/layouts`, data);
}

export async function getLayoutById(id: string) {
  return api.get(`/v1/layouts/${id}`);
}
