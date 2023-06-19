import { IMessagesPayload, IMessages } from './messages.interface';

import { WithHttp } from '../novu.interface';

const BASE_PATH = '/messages';

export class Messages extends WithHttp implements IMessages {
  async list(data?: IMessagesPayload) {
    const queryParams: Partial<IMessagesPayload> = {};
    data?.page && (queryParams.page = data?.page);
    data?.limit && (queryParams.limit = data?.limit);
    data?.subscriberId && (queryParams.subscriberId = data?.subscriberId);
    data?.channel && (queryParams.channel = data?.channel);
    data?.transactionId && (queryParams.transactionId = data?.transactionId);

    return await this.http.get(BASE_PATH, {
      params: queryParams,
    });
  }

  async deleteById(messageId: string) {
    return await this.http.delete(`${BASE_PATH}/${messageId}`);
  }
}
