import { Injectable } from '@nestjs/common';
import { GetFeedsCommand } from './get-feeds.command';
import { FeedEntity, FeedRepository } from '@novu/dal';

@Injectable()
export class GetFeeds {
  constructor(private feedRepository: FeedRepository) {}

  async execute(command: GetFeedsCommand): Promise<FeedEntity[]> {
    const feeds = await this.feedRepository.find({
      _environmentId: command.environmentId,
    });

    return feeds;
  }
}
