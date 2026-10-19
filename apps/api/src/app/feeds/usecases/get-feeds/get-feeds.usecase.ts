import { Injectable } from '@nestjs/common';
import { FeedEntity, FeedRepository } from '@novu/dal';
import { GetFeedsCommand } from './get-feeds.command';

@Injectable()
export class GetFeeds {
  constructor(private feedsRepository: FeedRepository) {}

  async execute(command: GetFeedsCommand): Promise<FeedEntity[]> {
    return await this.feedsRepository.find({
      _environmentId: command.environmentId,
    });
  }
}
