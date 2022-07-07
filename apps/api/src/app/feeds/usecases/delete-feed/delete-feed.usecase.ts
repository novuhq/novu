import { Injectable } from '@nestjs/common';
import { FeedRepository, DalException } from '@novu/dal';
import { DeleteFeedCommand } from './delete-feed.command';
import { ApiException } from '../../../shared/exceptions/api.exception';

@Injectable()
export class DeleteFeed {
  constructor(private feedRepository: FeedRepository) {}

  async execute(command: DeleteFeedCommand) {
    try {
      await this.feedRepository.delete({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.feedId,
      });
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
