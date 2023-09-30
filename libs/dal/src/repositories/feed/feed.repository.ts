import { SoftDeleteModel } from 'mongoose-delete';
import { FilterQuery } from 'mongoose';

import { BaseRepository } from '../base-repository';
import { FeedDBModel, FeedEntity } from './feed.entity';
import { Feed } from './feed.schema';
import { DalException } from '../../shared';
import { MessageTemplateRepository } from '../message-template';
import type { EnforceEnvOrOrgIds } from '../../types/enforce';

export class FeedRepository extends BaseRepository<FeedDBModel, FeedEntity, EnforceEnvOrOrgIds> {
  private feed: SoftDeleteModel;
  private messageTemplateRepository = new MessageTemplateRepository();
  constructor() {
    super(Feed, FeedEntity);
    this.feed = Feed;
  }

  async delete(query: FilterQuery<FeedEntity>) {
    const feed = await this.findOne({ _id: query._id, _environmentId: query._environmentId });
    if (!feed || !feed?._id) throw new DalException(`Could not find feed with id ${query._id}`);
    const relatedMessages = await this.messageTemplateRepository.getMessageTemplatesByFeed(
      feed._environmentId,
      feed._id
    );
    if (relatedMessages.length) throw new DalException(`Can not delete feed that has existing message`);

    return await this.feed.delete({ _id: feed._id, _environmentId: feed._environmentId });
  }

  async findDeleted(query: FilterQuery<FeedEntity>): Promise<FeedEntity> {
    const res: FeedEntity = await this.feed.findDeleted(query);

    return this.mapEntity(res);
  }
}
