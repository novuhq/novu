import { Injectable } from '@nestjs/common';
import { ChangeRepository } from '@novu/dal';
import { CountChangesCommand } from './count-changes.command';

@Injectable()
export class CountChanges {
  constructor(private changeRepository: ChangeRepository) {}

  async execute(command: CountChangesCommand): Promise<number> {
    return await this.changeRepository.count({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      enabled: false,
      _parentId: { $exists: false, $eq: null },
    });
  }
}
