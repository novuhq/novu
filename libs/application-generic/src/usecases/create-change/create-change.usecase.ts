import { Injectable } from '@nestjs/common';
import { ChangeRepository } from '@novu/dal';
import { getDiff, applyDiff } from 'recursive-diff';

import { CreateChangeCommand } from './create-change.command';

@Injectable()
export class CreateChange {
  constructor(private changeRepository: ChangeRepository) {}

  async execute(command: CreateChangeCommand) {
    const changes = await this.changeRepository.getEntityChanges(
      command.organizationId,
      command.type,
      command.item._id
    );
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
      _entityId: command.item._id,
      enabled: false,
      _parentId: command.parentChangeId,
      _id: command.changeId,
    });

    return item;
  }
}
