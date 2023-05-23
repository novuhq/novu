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
      console.log(`deleted default layout change parent: ${command.item._id} item: ${item?._id}`);
    }

    const newItem = command.item as LayoutEntity;

    if (!item) {
      /*
       * if (newItem.deleted) {
       *   return;
       * }
       */
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
      /*
       * if (newItem.deleted) {
       *   return;
       * }
       * const layoutEntity = {
       *   name: newItem.name,
       *   content: newItem.content,
       *   description: newItem.description,
       *   contentType: newItem.contentType,
       *   variables: newItem.variables,
       *   // isDefault: newItem.isDefault,
       *   channel: newItem.channel,
       *   _creatorId: command.userId,
       *   _environmentId: command.environmentId,
       *   _organizationId: command.organizationId,
       *   _parentId: newItem._id,
       * };
       *
       * return await this.layoutRepository.create(layoutEntity);
       */

      item = await this.layoutRepository.findOne({
        _environmentId: command.environmentId,
        _parentId: command.item._id,
      });

      if (!item) {
        console.log(`Not found layout with parent ${command.item._id}`);

        return;
        // throw new NotFoundException(`Not found layout with parent ${command.item._id}`);
      }
    }

    /*
     * const count = await this.layoutRepository.count({
     *   _organizationId: command.organizationId,
     *   _id: command.item._id,
     * });
     *
     * if (count === 0) {
     *   await this.layoutRepository.deleteLayout(item._id, command.environmentId, command.organizationId);
     *
     *   return;
     * }
     */

    console.log('update default');

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
