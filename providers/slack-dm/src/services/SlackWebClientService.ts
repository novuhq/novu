import { WebClient } from '@slack/web-api';

let instance: WebClient;

export function getSlackWebClientInstance(token: string): WebClient {
  if (!instance) {
    instance = new WebClient(token);
  }

  return instance;
}
