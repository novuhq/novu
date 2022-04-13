import { Injectable } from '@nestjs/common';
import { ChangeRepository } from '@novu/dal';
import { diff, diffApply } from '../utils';
import { CreateChangeCommand } from './create-change.command';

@Injectable()
export class CreateChange {
  constructor(private changeRepository: ChangeRepository) {}

  async execute(command: CreateChangeCommand) {
    const res = await this.changeRepository.find(
      {
        _entityId: command.item._id,
        type: command.type,
        enabled: true,
      },
      '',
      {
        sort: { createdAt: 1 },
      }
    );

    const aggregatedItem = res.reduce((prev, change) => {
      diffApply(prev, change.change);

      return prev;
    }, {});

    const d = diff(aggregatedItem, command.item);

    await this.changeRepository.create({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      _creatorId: command.userId,
      change: d,
      type: command.type,
      _entityId: command.item._id,
      enabled: true,
    });
  }
}
