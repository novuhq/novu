import { Injectable } from '@nestjs/common';
import { LayoutEntity, LayoutRepository } from '@novu/dal';

import { PromoteTypeChangeCommand } from '../promote-type-change.command';

@Injectable()
export class PromoteLayoutChange {
  constructor(private layoutRepository: LayoutRepository) {}

  async execute(command: PromoteTypeChangeCommand) {
    const item = await this.layoutRepository.findOne({
      _environmentId: command.environmentId,
      _id: command.item._id,
    });

    const newItem = command.item as LayoutEntity;

    if (!item) {
      const layoutEntity = {
        ...newItem,
        _creatorId: command.userId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      };

      return this.layoutRepository.createLayout(layoutEntity);
    }

    return this.layoutRepository.update(
      {
        _environmentId: command.environmentId,
        _id: item._id,
      },
      {
        name: newItem.name,
        content: newItem.content,
        contentType: newItem.contentType,
        variables: newItem.variables,
      }
    );
  }
}
