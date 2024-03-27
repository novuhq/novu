import { ConflictException, Injectable } from '@nestjs/common';
import { FeedRepository, FeedEntity } from '@novu/dal';
import { CreateFeedCommand } from './create-feed.command';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { CreateChange, CreateChangeCommand } from '@novu/application-generic';

@Injectable()
export class CreateFeed {
  constructor(private feedRepository: FeedRepository, private createChange: CreateChange) {}

  async execute(command: CreateFeedCommand): Promise<FeedEntity> {
    const feedExist = await this.feedRepository.findOne({
      _environmentId: command.environmentId,
      identifier: command.name,
    });

    if (feedExist) {
      throw new ConflictException(`Feed with identifier: ${command.name} already exists`);
    }

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
