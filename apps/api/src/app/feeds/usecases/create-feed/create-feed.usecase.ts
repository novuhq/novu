import { Injectable } from '@nestjs/common';
import { FeedRepository, FeedEntity } from '@novu/dal';
import { CreateFeedCommand } from './create-feed.command';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';
import { ChangeEntityTypeEnum } from '@novu/shared';

@Injectable()
export class CreateFeed {
  constructor(private feedRepository: FeedRepository, private createChange: CreateChange) {}

  async execute(command: CreateFeedCommand): Promise<FeedEntity> {
    const item = await this.feedRepository.create({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      name: command.name,
      identifier: command.name,
    });

    await this.createChange.execute(
      CreateChangeCommand.create({
        item,
        type: ChangeEntityTypeEnum.FEED,
        changeId: FeedRepository.createObjectId(),
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId,
      })
    );

    return item;
  }
}
