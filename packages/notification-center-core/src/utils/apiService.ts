import { ApiService } from '@novu/client';

let apiService: ApiService;

// TODO: remove???
export const createApiService = (backendUrl: string) => {
  if (!apiService) {
    apiService = new ApiService(backendUrl);
  }

  return apiService;
};

export const getApiService = () => {
  if (!apiService) {
    throw new Error('The ApiService should be initialized first');
  }

  return apiService;
};
