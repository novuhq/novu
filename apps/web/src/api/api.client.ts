import axios from 'axios';
import { CustomDataType, WorkflowPreferences } from '@novu/shared';
import { API_ROOT } from '../config';
import { getToken } from '../components/providers/AuthProvider';
import { getEnvironmentId } from '../components/providers/EnvironmentProvider';

interface IOptions {
  absoluteUrl: boolean;
}

axios.interceptors.request.use(async (config) => {
  config.headers.set('Novu-Environment-Id', getEnvironmentId());
  config.headers.set('Authorization', `Bearer ${await getToken()}`);

  return config;
});

// @deprecated Migrate all api methods to the new buildApiHttpClient that allows runtime configuration on the client object.
export const api = {
  get(url: string, options: IOptions = { absoluteUrl: false }) {
    return axios
      .get(buildUrl(url, options.absoluteUrl))
      .then((response) => {
        return response.data?.data;
      })
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  getFullResponse(url: string, params?: { [key: string]: string | string[] | number }) {
    return axios
      .get(`${API_ROOT}${url}`, { params })
      .then((response) => response.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  put(url: string, payload) {
    return axios
      .put(`${API_ROOT}${url}`, payload)
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  post(url: string, payload, params?: CustomDataType) {
    return axios
      .post(`${API_ROOT}${url}`, payload, { params })
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  patch(url: string, payload, params?: CustomDataType) {
    return axios
      .patch(`${API_ROOT}${url}`, payload, { params })
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  delete(url: string, payload = {}) {
    return axios
      .delete(`${API_ROOT}${url}`, payload)
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
};

function buildUrl(url: string, absoluteUrl: boolean) {
  return absoluteUrl ? url : `${API_ROOT}${url}`;
}

// WIP: The static API client needs to be replaced by a dynamic API client where api keys are injected.
export function buildApiHttpClient({
  baseURL = API_ROOT || 'https://api.novu.co',
  secretKey,
  environmentId = getEnvironmentId(),
}: {
  baseURL?: string;
  secretKey?: string;
  environmentId?: string;
}) {
  const httpClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  httpClient.interceptors.request.use(async (config) => {
    let authHeaderValue = '';

    if (secretKey) {
      authHeaderValue = `ApiKey ${secretKey}`;
    } else {
      const token = await getToken();
      authHeaderValue = `Bearer ${token}`;
      config.headers.set('Novu-Environment-Id', environmentId);
    }

    config.headers.set('Authorization', authHeaderValue);

    return config;
  });

  const get = async (url, params?: Record<string, string | string[] | number>) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await httpClient.get(url, { params });

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  const post = async (url, data = {}) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await httpClient.post(url, data);

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  const del = async (url, data = {}) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await httpClient.delete(url, data);

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  return {
    async getNotifications(params?: { page?: number; transactionId?: string }) {
      return get(`/v1/notifications`, params);
    },

    async getNotification(notificationId: string) {
      return get(`/v1/notifications/${notificationId}`);
    },

    async getApiKeys() {
      return get(`/v1/environments/api-keys`);
    },

    async syncBridge(bridgeUrl: string) {
      return post(`/v1/bridge/sync?source=studio`, {
        bridgeUrl,
      });
    },

    async getPreferences(workflowId: string) {
      return get(`/v1/preferences?workflowId=${workflowId}`);
    },

    async upsertPreferences(workflowId: string, preferences: WorkflowPreferences) {
      return post('/v1/preferences', { workflowId, preferences });
    },

    async deletePreferences(workflowId: string) {
      return del(`/v1/preferences?workflowId=${workflowId}`);
    },

    async postTelemetry(event: string, data?: Record<string, unknown>) {
      return post('/v1/telemetry/measure', {
        event,
        data,
      });
    },
  };
}
