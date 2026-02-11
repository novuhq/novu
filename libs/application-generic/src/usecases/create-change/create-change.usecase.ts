import { BadRequestException, Injectable } from '@nestjs/common';
import { ChangeRepository } from '@novu/dal';
import { applyDiff, getDiff } from 'recursive-diff';

import { CreateChangeCommand } from './create-change.command';

@Injectable()
export class CreateChange {
  constructor(private changeRepository: ChangeRepository) {}

  async execute(command: CreateChangeCommand) {
    const itemId = command.item._id;
    if (!itemId) {
      throw new BadRequestException('Item must have an _id to create a change');
    }

    const changes = await this.changeRepository.getEntityChanges(command.organizationId, command.type, itemId);
    const aggregatedItem = changes
      .filter((change) => change.enabled)
      .reduce((prev, change) => {
        return applyDiff(prev, change.change);
      }, {});

    const changePayload = getDiff(aggregatedItem, command.item, true);

    const change = await this.changeRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.changeId,
    });

    if (change) {
      change.change = changePayload;

      await this.changeRepository.update(
        { _environmentId: command.environmentId, _id: command.changeId },
        {
          $set: change,
        }
      );

      return change;
    }

    const item = await this.changeRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _creatorId: command.userId,
      change: changePayload,
      type: command.type,
      _entityId: itemId,
      enabled: false,
      _parentId: command.parentChangeId,
      _id: command.changeId,
    });

    return item;
  }
}
