import type { PaginatedResponse } from '../types';
import { BaseModule } from '../utils/base-module';
import { Notification } from './notification';

interface FetchFeedOptions {
  page?: number;
  feedIdentifier?: string | string[];
  seen?: boolean;
  read?: boolean;
  limit?: number;
  payload?: Record<string, unknown>;
}

export class Feeds extends BaseModule {
  async fetch({ page = 1, ...restOptions }: FetchFeedOptions): Promise<PaginatedResponse<Notification>> {
    return this.callWithSession(async () => {
      try {
        this._emitter.emit('feeds.fetch.pending');

        const response = await this._apiService.getNotificationsList(page, restOptions);
        const modifiedResponse: PaginatedResponse<Notification> = {
          ...response,
          data: response.data.map((el) => new Notification(el)),
        };

        this._emitter.emit('feeds.fetch.success', { response: modifiedResponse });

        return response;
      } catch (error) {
        this._emitter.emit('feeds.fetch.error', { error });
      }
    });
  }
}
