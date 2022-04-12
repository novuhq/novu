import axios from 'axios';
import { API_URL } from './shared';

export async function get(url: string) {
  return await axios.get(`${API_URL}/v1${url}`).then((response) => response.data.data);
}

export async function post(url: string, body = {}) {
  return await axios.post(`${API_URL}/v1${url}`, body).then((response) => response.data.data);
}
