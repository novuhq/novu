import { Injectable } from '@nestjs/common';
import { FeedRepository, FeedEntity } from '@novu/dal';
import { GetFeedsCommand } from './get-feeds.command';
import { CreateFeed } from '../create-feed/create-feed.usecase';
import { CreateFeedCommand } from '../create-feed/create-feed.command';

@Injectable()
export class GetFeeds {
  constructor(private feedsRepository: FeedRepository, private createFeed: CreateFeed) {}

  async execute(command: GetFeedsCommand): Promise<FeedEntity[]> {
    let feeds = await this.feedsRepository.find({
      _environmentId: command.environmentId,
    });

    if (!feeds.length) {
      await this.createFeed.execute(
        CreateFeedCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          name: 'Activities',
        })
      );
      feeds = await this.feedsRepository.find({
        _environmentId: command.environmentId,
      });
    }

    return feeds;
  }
}
