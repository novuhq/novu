import { BaseRepository } from '../base-repository';
import { SoftDeleteModel } from 'mongoose-delete';
import { FeedEntity } from './feed.entity';
import { Feed } from './feed.schema';
import { Document, FilterQuery } from 'mongoose';
import { DalException } from '../../shared';
import { MessageTemplateRepository } from '../message-template';

export class FeedRepository extends BaseRepository<FeedEntity> {
  private feed: SoftDeleteModel;
  private messageTemplateRepository = new MessageTemplateRepository();
  constructor() {
    super(Feed, FeedEntity);
    this.feed = Feed;
  }

  async delete(query: FilterQuery<FeedEntity & Document>) {
    const feed = await this.findOne({ _id: query._id });
    if (!feed) throw new DalException(`Could not find feed with id ${query._id}`);
    const relatedMessages = await this.messageTemplateRepository.getMessageTemplatesByFeed(
      feed._environmentId,
      feed._id
    );
    if (relatedMessages.length) throw new DalException(`Can not delete feed that has existing message`);
    await this.feed.delete({ _id: feed._id, _environmentId: feed._environmentId });
  }

  async findDeleted(query: FilterQuery<FeedEntity & Document>): Promise<FeedEntity> {
    const res = await this.feed.findDeleted(query);

    return this.mapEntity(res);
  }
}
