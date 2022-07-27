import { BaseRepository } from '../base-repository';
import { MessageTemplate } from './message-template.schema';
import { MessageTemplateEntity } from './message-template.entity';

export class MessageTemplateRepository extends BaseRepository<MessageTemplateEntity> {
  constructor() {
    super(MessageTemplate, MessageTemplateEntity);
  }

  async getMessageTemplatesByFeed(environmentId: string, feedId: string) {
    return await this.find({
      _environmentId: environmentId,
      _feedId: feedId,
    });
  }
}
