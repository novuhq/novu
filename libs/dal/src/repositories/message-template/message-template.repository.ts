import { BaseRepository, Omit } from '../base-repository';
import { MessageTemplate } from './message-template.schema';
import { MessageTemplateEntity } from './message-template.entity';
import { Document, FilterQuery } from 'mongoose';

class PartialMessageTemplateEntity extends Omit(MessageTemplateEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialMessageTemplateEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class MessageTemplateRepository extends BaseRepository<EnforceEnvironmentQuery, MessageTemplateEntity> {
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
