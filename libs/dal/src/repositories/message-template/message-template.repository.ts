import { FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import { DalException } from '../../shared';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { MessageTemplateDBModel, MessageTemplateEntity } from './message-template.entity';
import { MessageTemplate } from './message-template.schema';

type MessageTemplateQuery = FilterQuery<MessageTemplateDBModel>;

export class MessageTemplateRepository extends BaseRepository<
  MessageTemplateDBModel,
  MessageTemplateEntity,
  EnforceEnvOrOrgIds
> {
  private messageTemplate: SoftDeleteModel;
  constructor() {
    super(MessageTemplate, MessageTemplateEntity);
    this.messageTemplate = MessageTemplate;
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

  async delete(query: MessageTemplateQuery) {
    const messageTemplate = await this.findOne({
      _id: query._id,
      _environmentId: query._environmentId,
    });

    if (!messageTemplate) {
      throw new DalException(`Could not find a message template with id ${query._id}`);
    }

    return await this.messageTemplate.delete({
      _id: messageTemplate._id,
      _environmentId: messageTemplate._environmentId,
    });
  }

  async findDeleted(query: MessageTemplateQuery): Promise<MessageTemplateEntity> {
    const res: MessageTemplateEntity = await this.messageTemplate.findDeleted(query);

    return this.mapEntity(res);
  }
}
