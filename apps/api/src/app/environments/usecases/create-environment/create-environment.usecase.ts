import { Injectable } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { nanoid } from 'nanoid';

import { CreateEnvironmentCommand } from './create-environment.command';

import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
// eslint-disable-next-line max-len
import { CreateNotificationGroupCommand } from '../../../notification-groups/usecases/create-notification-group/create-notification-group.command';
import { CreateNotificationGroup } from '../../../notification-groups/usecases/create-notification-group/create-notification-group.usecase';

@Injectable()
export class CreateEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private createNotificationGroup: CreateNotificationGroup,
    private generateUniqueApiKey: GenerateUniqueApiKey
  ) {}

  async execute(command: CreateEnvironmentCommand) {
    const key = await this.generateUniqueApiKey.execute();

    const environment = await this.environmentRepository.create({
      _organizationId: command.organizationId,
      name: command.name,
      identifier: nanoid(12),
      _parentId: command.parentEnvironmentId,
      apiKeys: [
        {
          key,
          _userId: command.userId,
        },
      ],
    });

    if (!command.parentEnvironmentId) {
      await this.createNotificationGroup.execute(
        CreateNotificationGroupCommand.create({
          organizationId: command.organizationId,
          environmentId: environment._id,
          userId: command.userId,
          name: 'General',
        })
      );
    }

    return environment;
  }
}
