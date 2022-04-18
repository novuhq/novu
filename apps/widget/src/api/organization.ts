import { get } from './api.service';

export function getOrganization() {
  return get('/widgets/organization');
}
