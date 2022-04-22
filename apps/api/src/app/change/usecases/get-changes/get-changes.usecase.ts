import { Injectable } from '@nestjs/common';
import { ChangeEntity, ChangeRepository } from '@novu/dal';
import { GetChangesCommand } from './get-changes.command';

@Injectable()
export class GetChanges {
  constructor(private changeRepository: ChangeRepository) {}

  async execute(command: GetChangesCommand): Promise<ChangeEntity[]> {
    return await this.changeRepository.getList(command.organizationId, command.environmentId, command.promoted);
  }
}
