import { Injectable } from '@nestjs/common';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { FeedEntity, FeedRepository } from '@novu/dal';

@Injectable()
export class PromoteFeedChange {
  constructor(private feedRepository: FeedRepository) {}

  async execute(command: PromoteTypeChangeCommand) {
    let item: FeedEntity | undefined = undefined;
    if (command.item._id) {
      item = await this.feedRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _id: command.item._id,
      });
    }

    if (item === null) {
      const items = await this.feedRepository.findDeleted({
        _organizationId: command.organizationId,
        _id: command.item._id,
      });
      item = items[0];
    }

    const newItem = command.item as FeedEntity;

    if (!item) {
      return this.feedRepository.create({
        name: newItem.name,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });
    }

    return await this.feedRepository.update(
      {
        _id: item._id,
      },
      {
        name: newItem.name,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      }
    );
  }
}
