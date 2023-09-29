import { Injectable } from '@nestjs/common';
import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { FeedEntity, FeedRepository } from '@novu/dal';

@Injectable()
export class PromoteFeedChange {
  constructor(private feedRepository: FeedRepository) {}

  async execute(command: PromoteTypeChangeCommand) {
    let item: FeedEntity | null = null;
    if (command.item.name) {
      item = await this.feedRepository.findOne({
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        name: command.item.name,
      });
    }

    if (!item) {
      if (command.item.deleted) {
        return;
      }

      return this.feedRepository.create({
        name: command.item.name,
        identifier: command.item.name,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      });
    }

    return await this.feedRepository.delete({ _environmentId: command.environmentId, _id: item._id });
  }
}
