import { BadRequestException, Injectable } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';

import { PromoteTypeChangeCommand } from '../promote-type-change.command';

@Injectable()
export class PromoteLayoutChange {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: PromoteTypeChangeCommand) {
    const itemId = command.item._id;
    if (!itemId) {
      throw new BadRequestException('Item must have an _id to promote layout change');
    }

    let item = await this.layoutRepository.findOne({
      _environmentId: command.environmentId,
      _parentId: itemId,
    });

    // For the scenario where the layout is deleted and an active default layout change was pending
    if (!item) {
      item = await this.layoutRepository.findDeletedByParentId(itemId, command.environmentId);
    }

    const newItem = command.item as LayoutEntity;

    if (!item) {
      const layoutEntity = {
        name: newItem.name,
        identifier: newItem.identifier,
        content: newItem.content,
        description: newItem.description,
        contentType: newItem.contentType,
        variables: newItem.variables,
        isDefault: newItem.isDefault,
        channel: newItem.channel,
        _creatorId: command.userId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _parentId: newItem._id,
      };

      return await this.layoutRepository.create(layoutEntity);
    }

    const count = await this.layoutRepository.count({
      _organizationId: command.organizationId,
      _id: itemId,
    });

    if (count === 0) {
      await this.layoutRepository.deleteLayout(item._id, command.environmentId, command.organizationId);

      return;
    }

    return await this.layoutRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        name: newItem.name,
        identifier: newItem.identifier,
        content: newItem.content,
        description: newItem.description,
        contentType: newItem.contentType,
        variables: newItem.variables,
        isDefault: newItem.isDefault,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      }
    );
  }
}
