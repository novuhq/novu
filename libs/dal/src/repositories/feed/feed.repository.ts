import { BaseRepository } from '../base-repository';
import { FeedEntity } from './feed.entity';
import { Feed } from './feed.schema';

export class FeedRepository extends BaseRepository<FeedEntity> {
  constructor() {
    super(Feed, FeedEntity);
  }
}
