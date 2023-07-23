import { IMessagesPayload, IMessages } from './messages.interface';
import { Novu } from '../novu';

const BASE_PATH = '/messages';

export class Messages implements IMessages {
  constructor(private readonly novu: Novu) {}

  async list(data?: IMessagesPayload) {
    const queryParams: Partial<IMessagesPayload> & {
      transactionId?: string[];
    } = {};
    data?.page && (queryParams.page = data?.page);
    data?.limit && (queryParams.limit = data?.limit);
    data?.subscriberId && (queryParams.subscriberId = data?.subscriberId);
    data?.channel && (queryParams.channel = data?.channel);
    data?.transactionIds && (queryParams.transactionId = data?.transactionIds);

    return await this.novu.get(BASE_PATH, {
      params: queryParams,
    });
  }

  async deleteById(messageId: string) {
    return await this.novu.delete(`${BASE_PATH}/${messageId}`);
  }
}
