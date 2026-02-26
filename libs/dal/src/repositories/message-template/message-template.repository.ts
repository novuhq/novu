import { ClientSession, FilterQuery } from 'mongoose';
import { SoftDeleteModel } from 'mongoose-delete';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';
import { BaseRepository } from '../base-repository';
import { MessageTemplateDBModel, MessageTemplateEntity } from './message-template.entity';
import { MessageTemplate } from './message-template.schema';

type MessageTemplateQuery = FilterQuery<MessageTemplateDBModel>;
export interface DeleteMsgByIdQuery {
  _id: string;
  _environmentId: string;
}

export interface RepositoryOptions {
  session?: ClientSession | null;
}
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
    return await this.messageTemplate.delete({
      _id: query._id,
      _environmentId: query._environmentId,
    });
  }

  async deleteById(query: DeleteMsgByIdQuery, options: RepositoryOptions = {}) {
    const { session } = options;

    const deleteQuery = this.messageTemplate.delete({
      _id: query._id,
      _environmentId: query._environmentId,
    });

    if (session) {
      deleteQuery.session(session);
    }

    return await deleteQuery;
  }

  async findDeleted(query: MessageTemplateQuery): Promise<MessageTemplateEntity> {
    const res: MessageTemplateEntity = await this.messageTemplate.findDeleted(query);

    return this.mapEntity(res);
  }
}
