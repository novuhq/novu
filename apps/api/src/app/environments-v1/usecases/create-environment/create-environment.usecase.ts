import { BadRequestException, Injectable, UnprocessableEntityException } from '@nestjs/common';
import { createHash } from 'crypto';
import { nanoid } from 'nanoid';

import { encryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository, NotificationGroupRepository } from '@novu/dal';

import { EnvironmentEnum, PROTECTED_ENVIRONMENTS } from '@novu/shared';
import { CreateNovuIntegrationsCommand } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.command';
import { CreateNovuIntegrations } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { CreateDefaultLayout, CreateDefaultLayoutCommand } from '../../../layouts/usecases';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { CreateEnvironmentCommand } from './create-environment.command';

@Injectable()
export class CreateEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private notificationGroupRepository: NotificationGroupRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private createDefaultLayoutUsecase: CreateDefaultLayout,
    private createNovuIntegrationsUsecase: CreateNovuIntegrations
  ) {}

  async execute(command: CreateEnvironmentCommand) {
    const environmentCount = await this.environmentRepository.count({
      _organizationId: command.organizationId,
    });

    if (environmentCount >= 10) {
      throw new BadRequestException('Organization cannot have more than 10 environments');
    }
    const normalizedName = command.name.trim();

    if (!command.system) {
      const { name } = command;

      if (PROTECTED_ENVIRONMENTS?.map((env) => env.toLowerCase()).includes(normalizedName.toLowerCase())) {
        throw new UnprocessableEntityException('Environment name cannot be Development or Production');
      }

      const environment = await this.environmentRepository.findOne({
        _organizationId: command.organizationId,
        name,
      });

      if (environment) {
        throw new BadRequestException('Environment name must be unique');
      }
    }

    const key = await this.generateUniqueApiKey.execute();
    const encryptedApiKey = encryptApiKey(key);
    const hashedApiKey = createHash('sha256').update(key).digest('hex');
    const color = this.getEnvironmentColor(command.name, command.color);

    if (!color) {
      throw new BadRequestException('Color property is required');
    }

    const environment = await this.environmentRepository.create({
      _organizationId: command.organizationId,
      name: normalizedName,
      identifier: nanoid(12),
      _parentId: command.parentEnvironmentId,
      color,
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

    await this.createNovuIntegrationsUsecase.execute(
      CreateNovuIntegrationsCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        userId: command.userId,
      })
    );

    return environment;
  }

  private getEnvironmentColor(name: string, commandColor?: string): string | undefined {
    if (name === EnvironmentEnum.DEVELOPMENT) return '#ff8547';
    if (name === EnvironmentEnum.PRODUCTION) return '#7e52f4';

    return commandColor;
  }
}
