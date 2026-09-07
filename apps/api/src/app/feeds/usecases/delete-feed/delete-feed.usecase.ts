import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateChange, CreateChangeCommand } from '@novu/application-generic';
import { ChangeRepository, DalException, FeedRepository } from '@novu/dal';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { DeleteFeedCommand } from './delete-feed.command';

@Injectable()
export class DeleteFeed {
  constructor(
    private feedRepository: FeedRepository,
    private createChange: CreateChange,
    private changeRepository: ChangeRepository
  ) {}

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

      const parentChangeId: string = await this.changeRepository.getChangeId(
        command.environmentId,
        ChangeEntityTypeEnum.FEED,
        command.feedId
      );

      await this.createChange.execute(
        CreateChangeCommand.create({
          organizationId: command.organizationId,
          environmentId: command.environmentId,
          userId: command.userId,
          item,
          type: ChangeEntityTypeEnum.FEED,
          changeId: parentChangeId,
        })
      );
    } catch (e) {
      if (e instanceof DalException) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    return await this.feedRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
