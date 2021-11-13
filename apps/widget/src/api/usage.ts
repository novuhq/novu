import { post } from './api.service';

export async function postUsageLog(name: string, payload: { [key: string]: string | boolean | undefined }) {
  return await post('/widgets/usage/log', {
    name: `[Widget] - ${name}`,
    payload,
  });
}
