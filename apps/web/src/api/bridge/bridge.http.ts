import axios from 'axios';
import { CustomDataType } from '@novu/shared';
import { getTunnelUrl } from './utils';

export const bridgeHttp = {
  get(url: string, params = {}) {
    return axios
      .get(buildUrl(url), {
        headers: getHeaders(),
        params,
      })
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  put(url: string, payload) {
    return axios
      .put(`${buildUrl(url)}`, payload, {
        headers: getHeaders(),
      })
      .then((response) => response.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  post(url: string, payload, params?: CustomDataType) {
    return axios
      .post(buildUrl(url), payload, { params, headers: getHeaders() })
      .then((response) => response.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
};

function buildUrl(url: string) {
  const BRIDGE_ENDPOINT = getTunnelUrl();
  if (!BRIDGE_ENDPOINT) {
    throw new Error('Bridge URL is not set');
  }

  return BRIDGE_ENDPOINT + url;
}

function getHeaders() {
  return {
    'Bypass-Tunnel-Reminder': true,
  };
}
