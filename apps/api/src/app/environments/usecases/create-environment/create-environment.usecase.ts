import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import * as hat from 'hat';
import { nanoid } from 'nanoid';
import { CreateEnvironmentCommand } from './create-environment.command';

@Injectable()
export class CreateEnvironment {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: CreateEnvironmentCommand) {
    return await this.environmentRepository.create({
      _organizationId: command.organizationId,
      name: command.name,
      identifier: nanoid(12),
      _parentId: command.parentEnvironmentId,
      apiKeys: [
        {
          key: hat(),
          _userId: command.userId,
        },
      ],
    });
  }
}
