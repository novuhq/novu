import { API_CREATE_APPLICATION_URL } from '../constants';
import { post } from './api.service';

export function createApplication(applicationName: string) {
  return post(API_CREATE_APPLICATION_URL, { name: applicationName });
}
