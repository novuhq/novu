import { nanoid } from 'nanoid';
import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';

import { EnvironmentRepository, NotificationGroupRepository } from '@novu/dal';
import { encryptApiKey } from '@novu/application-generic';

import { CreateEnvironmentCommand } from './create-environment.command';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { CreateDefaultLayout, CreateDefaultLayoutCommand } from '../../../layouts/usecases';

@Injectable()
export class CreateEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private createDefaultLayoutUsecase: CreateDefaultLayout
  ) {}

  async execute(command: CreateEnvironmentCommand) {
    const key = await this.generateUniqueApiKey.execute();
    const encryptedApiKey = encryptApiKey(key);
    const hashedApiKey = createHash('sha256').update(key).digest('hex');

    const environment = await this.environmentRepository.create({
      _organizationId: command.organizationId,
      name: command.name,
      identifier: nanoid(12),
      _parentId: command.parentEnvironmentId,
      apiKeys: [
        {
          key: encryptedApiKey,
          _userId: command.userId,
          hash: hashedApiKey,
        },
      ],
    });

    if (!command.parentEnvironmentId) {
      await this.notificationGroupRepository.create({
        _environmentId: environment._id,
        _organizationId: command.organizationId,
        name: 'General',
      });

      await this.createDefaultLayoutUsecase.execute(
        CreateDefaultLayoutCommand.create({
          organizationId: command.organizationId,
          environmentId: environment._id,
          userId: command.userId,
        })
      );
    }

    if (command.parentEnvironmentId) {
      const group = await this.notificationGroupRepository.findOne({
        _organizationId: command.organizationId,
        _environmentId: command.parentEnvironmentId,
      });

      await this.notificationGroupRepository.create({
        _environmentId: environment._id,
        _organizationId: command.organizationId,
        name: group?.name,
        _parentId: group?._id,
      });
    }

    return environment;
  }
}
