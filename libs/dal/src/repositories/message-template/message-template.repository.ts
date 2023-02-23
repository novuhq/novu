import { BaseRepository } from '../base-repository';
import { MessageTemplate } from './message-template.schema';
import { MessageTemplateEntity, MessageTemplateDBModel } from './message-template.entity';
export class MessageTemplateRepository extends BaseRepository<MessageTemplateDBModel, MessageTemplateEntity> {
  constructor() {
    super(MessageTemplate, MessageTemplateEntity);
  }

  async getMessageTemplatesByFeed(environmentId: string, feedId: string) {
    return await this.find({
      _environmentId: environmentId,
      _feedId: feedId,
    });
  }

  async getMessageTemplatesByLayout(_environmentId: string, _layoutId: string, pagination?: { limit?: number }) {
    return await this.find(
      {
        _environmentId,
        _layoutId,
      },
      {},
      pagination
    );
  }
}
