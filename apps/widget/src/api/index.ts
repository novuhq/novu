export * from './application';
export * from './hooks';

import { API_ROOT } from '../config';

export function concatApiRoot(urlRoute: string) {
  return `${API_ROOT}${urlRoute}`;
}
