import { get } from './api.service';

export function getEnvironment() {
  return get('/widgets/environment');
}
