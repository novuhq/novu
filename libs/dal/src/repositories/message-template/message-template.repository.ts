import { BaseRepository } from '../base-repository';
import { MessageTemplate } from './message-template.schema';
import { MessageTemplateEntity, MessageTemplateDBModel } from './message-template.entity';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

export class MessageTemplateRepository extends BaseRepository<
  MessageTemplateDBModel,
  MessageTemplateEntity,
  EnforceEnvOrOrgIds
> {
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
