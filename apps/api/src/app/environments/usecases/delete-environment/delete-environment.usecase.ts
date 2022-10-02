import { Injectable } from '@nestjs/common';
import { EnvironmentEntity, EnvironmentRepository } from '@novu/dal';

import { DeleteEnvironmentCommand } from './delete-environment.command';

@Injectable()
export class DeleteEnvironment {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: DeleteEnvironmentCommand) {
    return await this.environmentRepository.delete({
      _id: command._id,
    });
  }
}
