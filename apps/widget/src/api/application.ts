import { get } from './api.service';

export function getApplication() {
  return get('/widgets/application');
}
