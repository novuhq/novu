import { forwardRef, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { LayoutEntity, LayoutRepository, ChangeRepository } from '@novu/dal';

import { PromoteTypeChangeCommand } from '../promote-type-change.command';
import { ChangeEntityTypeEnum } from '@novu/shared';
import { ApplyChange, ApplyChangeCommand } from '../apply-change';

@Injectable()
export class PromoteDefaultLayoutChange {
  constructor(
    private layoutRepository: LayoutRepository,
    private changeRepository: ChangeRepository,
    @Inject(forwardRef(() => ApplyChange)) private applyChange: ApplyChange
  ) {}

  async execute(command: PromoteTypeChangeCommand) {
    let item = await this.layoutRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: command.item._id,
    });

    // For the scenario where the layout is deleted and an active default layout change was pending
    if (!item) {
      item = await this.layoutRepository.findDeletedByParentId(command.item._id, command.environmentId);
    }

    const newItem = command.item as LayoutEntity;

    if (!item) {
      if (newItem.deleted) {
        return;
      }

      const changes = await this.changeRepository.getEntityChanges(
        command.organizationId,
        ChangeEntityTypeEnum.LAYOUT,
        command.item._id
      );

      for (const change of changes) {
        await this.applyChange.execute(
          ApplyChangeCommand.create({
            changeId: change._id,
            environmentId: change._environmentId,
            organizationId: change._organizationId,
            userId: command.userId,
          })
        );
      }

      item = await this.layoutRepository.findOne({
        _environmentId: command.environmentId,
        _parentId: command.item._id,
      });

      if (!item) {
        return;
      }
    }

    return await this.layoutRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        isDefault: newItem.isDefault,
      }
    );
  }
}
