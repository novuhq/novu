import { Injectable } from '@nestjs/common';
import { FeedRepository, DalException } from '@novu/dal';
import { DeleteFeedCommand } from './delete-feed.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { CreateChange } from '../../../change/usecases/create-change.usecase';
import { CreateChangeCommand } from '../../../change/usecases/create-change.command';
import { ChangeEntityTypeEnum } from '@novu/shared';

@Injectable()
export class DeleteFeed {
  constructor(private feedRepository: FeedRepository, private createChange: CreateChange) {}

  async execute(command: DeleteFeedCommand) {
    try {
      await this.feedRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.feedId,
      });
      const items = await this.feedRepository.findDeleted({
        _environmentId: command.environmentId,
        _id: command.feedId,
      });
      const item = items[0];
      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          item,
          type: ChangeEntityTypeEnum.FEED,
          changeId: FeedRepository.createObjectId(),
        })
      );
    } catch (e) {
      if (e instanceof DalException) {
        throw new ApiException(e.message);
      }
      throw e;
    }

    return await this.feedRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
