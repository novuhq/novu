import { HttpClient, ApiOptions } from '@novu/client';

import type { Session } from '../types';

export type InboxServiceOptions = ApiOptions;

export class InboxService {
  #token: string | undefined;
  #httpClient: HttpClient;

  constructor(options: InboxServiceOptions = {}) {
    this.#httpClient = new HttpClient(options);
  }

  async initializeSession({
    applicationIdentifier,
    subscriberId,
    subscriberHash,
  }: {
    applicationIdentifier: string;
    subscriberId: string;
    subscriberHash?: string;
  }): Promise<Session> {
    const response = (await this.#httpClient.post(`/inbox/session`, {
      applicationIdentifier,
      subscriberId,
      subscriberHash,
    })) as Session;

    this.#token = response.token;

    return response;
  }
}
