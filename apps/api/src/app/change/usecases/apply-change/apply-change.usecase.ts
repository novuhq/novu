import { Injectable, NotFoundException } from '@nestjs/common';

import { ChangeEntity, ChangeRepository } from '@novu/dal';

import { PromoteChangeToEnvironmentCommand, PromoteChangeToEnvironment } from '../promote-change-to-environment';
import { ApplyChangeCommand } from './apply-change.command';

@Injectable()
export class ApplyChange {
  constructor(
    private changeRepository: ChangeRepository,
    private promoteChangeToEnvironment: PromoteChangeToEnvironment
  ) {}

  async execute(command: ApplyChangeCommand): Promise<ChangeEntity[]> {
    const parentChange = await this.changeRepository.findOne({
      _id: command.changeId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!parentChange) throw new NotFoundException('Parent Change not found');

    const changes = await this.changeRepository.find(
      { _environmentId: parentChange._environmentId, _parentId: parentChange._id },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    const items: ChangeEntity[] = [];
    for (const change of [...changes, parentChange]) {
      const item = await this.applyChange(change, command);
      items.push(item);
    }

    return items;
  }

  async applyChange(change, command: ApplyChangeCommand): Promise<ChangeEntity> {
    if (!change) {
      throw new NotFoundException();
    }

    try {
      await this.changeRepository.update(
        {
          _id: change._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          enabled: true,
        }
      );

      await this.promoteChangeToEnvironment.execute(
        PromoteChangeToEnvironmentCommand.create({
          itemId: change._entityId,
          type: change.type,
          environmentId: change._environmentId,
          organizationId: change._organizationId,
          userId: command.userId,
        })
      );
    } catch (e) {
      await this.changeRepository.update(
        {
          _id: change._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        {
          enabled: false,
        }
      );

      throw e;
    }

    return change;
  }
}
