import { api } from '@novu/shared';
import { concatApiRoot } from './index';

export function getCurrentApplication() {
  return api.get(concatApiRoot('/v1/applications/me'));
}
