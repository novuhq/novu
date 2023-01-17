import axios from 'axios';

export async function get(url: string) {
  return await axios.get(url).then((response) => response.data.data);
}

export async function post(url: string, body = {}) {
  return await axios.post(url, body).then((response) => response.data.data);
}

export async function put(url: string, body = {}) {
  return await axios.put(url, body).then((response) => response.data.data);
}

export function storeHeader(key: string, value: string): void {
  axios.defaults.headers.common[key] = value;
}
