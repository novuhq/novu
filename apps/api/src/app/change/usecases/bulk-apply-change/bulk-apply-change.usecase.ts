import { Injectable } from '@nestjs/common';
import { ChangeEntity, ChangeRepository } from '@novu/dal';

import { BulkApplyChangeCommand } from './bulk-apply-change.command';

import { ApplyChange, ApplyChangeCommand } from '../apply-change';

@Injectable()
export class BulkApplyChange {
  constructor(private changeRepository: ChangeRepository, private applyChange: ApplyChange) {}

  async execute(command: BulkApplyChangeCommand): Promise<ChangeEntity[][]> {
    const changes = await this.changeRepository.find(
      {
        _id: {
          $in: command.changeIds,
        },
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '',
      { sort: { createdAt: 1 } }
    );

    const results: ChangeEntity[][] = [];

    for (const change of changes) {
      const item = await this.applyChange.execute(
        ApplyChangeCommand.create({
          changeId: change._id,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          userId: command.userId,
        })
      );

      results.push(item);
    }

    return results;
  }
}
