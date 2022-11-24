import { BaseRepository, Omit } from '../base-repository';
import { SoftDeleteModel } from 'mongoose-delete';
import { FeedEntity } from './feed.entity';
import { Feed } from './feed.schema';
import { Document, FilterQuery } from 'mongoose';
import { DalException } from '../../shared';
import { MessageTemplateRepository } from '../message-template';

class PartialIntegrationEntity extends Omit(FeedEntity, ['_environmentId', '_organizationId']) {}

type EnforceEnvironmentQuery = FilterQuery<PartialIntegrationEntity & Document> &
  ({ _environmentId: string } | { _organizationId: string });

export class FeedRepository extends BaseRepository<EnforceEnvironmentQuery, FeedEntity> {
  private feed: SoftDeleteModel;
  private messageTemplateRepository = new MessageTemplateRepository();
  constructor() {
    super(Feed, FeedEntity);
    this.feed = Feed;
  }

  async delete(query: EnforceEnvironmentQuery) {
    const feed = await this.findOne({ _id: query._id, _environmentId: query._environmentId });
    if (!feed) throw new DalException(`Could not find feed with id ${query._id}`);
    const relatedMessages = await this.messageTemplateRepository.getMessageTemplatesByFeed(
      feed._environmentId,
      feed._id
    );
    if (relatedMessages.length) throw new DalException(`Can not delete feed that has existing message`);

    const requestQuery: EnforceEnvironmentQuery = { _id: feed._id, _environmentId: feed._environmentId };

    await this.feed.delete(requestQuery);
  }

  async findDeleted(query: EnforceEnvironmentQuery): Promise<FeedEntity> {
    const res = await this.feed.findDeleted(query);

    return this.mapEntity(res);
  }
}
