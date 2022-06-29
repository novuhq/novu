import { Injectable } from '@nestjs/common';
import { FeedRepository, FeedEntity } from '@novu/dal';
import { CreateFeedCommand } from './create-feed.command';

@Injectable()
export class CreateFeed {
  constructor(private feedRepository: FeedRepository) {}

  async execute(command: CreateFeedCommand): Promise<FeedEntity> {
    const item = await this.feedRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      name: command.name,
    });

    return item;
  }
}
