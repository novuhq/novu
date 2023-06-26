import { Injectable } from '@nestjs/common';
import { ChangeRepository } from '@novu/dal';
import { DeleteChangeCommand } from './delete-change.command';

@Injectable()
export class DeleteChange {
  constructor(private changeRepository: ChangeRepository) {}

  async execute(command: DeleteChangeCommand) {
    await this.changeRepository.delete({
      _id: command.changeId,
      _organizationId: command.organizationId,
    });
  }
}
