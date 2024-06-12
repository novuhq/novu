import { nanoid } from 'nanoid';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createHash } from 'crypto';

import { EnvironmentRepository } from '@novu/dal';
import { ApiException, encryptApiKey, buildBridgeEndpointUrl } from '@novu/application-generic';

import { CreateEnvironmentCommand } from './create-environment.command';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
// eslint-disable-next-line max-len
import { CreateNotificationGroupCommand } from '../../../notification-groups/usecases/create-notification-group/create-notification-group.command';
import { CreateNotificationGroup } from '../../../notification-groups/usecases/create-notification-group/create-notification-group.usecase';
import { CreateDefaultLayout, CreateDefaultLayoutCommand } from '../../../layouts/usecases/create-default-layout';

@Injectable()
export class CreateEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private createNotificationGroup: CreateNotificationGroup,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private createDefaultLayoutUsecase: CreateDefaultLayout,
    protected moduleRef: ModuleRef
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

    if (command.name === 'Development') {
      await this.storeDefaultTunnelUrl(command.userId, command.organizationId, environment._id, key);
    }

    if (!command.parentEnvironmentId) {
      await this.createNotificationGroup.execute(
        CreateNotificationGroupCommand.create({
          organizationId: command.organizationId,
          environmentId: environment._id,
          userId: command.userId,
          name: 'General',
        })
      );

      await this.createDefaultLayoutUsecase.execute(
        CreateDefaultLayoutCommand.create({
          organizationId: command.organizationId,
          environmentId: environment._id,
          userId: command.userId,
        })
      );
    }

    return environment;
  }

  private async storeDefaultTunnelUrl(userId: string, organizationId: string, environmentId: string, apiKey: string) {
    try {
      if (process.env.NOVU_ENTERPRISE === 'true' || process.env.CI_EE_TEST === 'true') {
        if (!require('@novu/ee-echo-api')?.StoreBridgeConfiguration) {
          throw new ApiException('Echo api module is not loaded');
        }

        const baseUrl = process.env.TUNNEL_BASE_ADDRESS;

        if (baseUrl === undefined || baseUrl === '') {
          throw new InternalServerErrorException('Base tunnel url not configured');
        }

        const bridgeUrl = buildBridgeEndpointUrl(apiKey, baseUrl);

        const usecase = this.moduleRef.get(require('@novu/ee-echo-api')?.StoreBridgeConfiguration, {
          strict: false,
        });

        await usecase.execute({
          userId,
          organizationId,
          environmentId,
          bridgeUrl,
        });
      }
    } catch (e) {
      Logger.error(e, `Unexpected error while importing enterprise modules`, 'StoreBridgeConfiguration');
    }
  }
}
