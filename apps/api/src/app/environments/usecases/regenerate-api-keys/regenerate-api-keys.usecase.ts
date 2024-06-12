import { createHash } from 'crypto';
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';

import { EnvironmentRepository } from '@novu/dal';
import { buildBridgeEndpointUrl, decryptApiKey, encryptApiKey } from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';
import { IApiKeyDto } from '../../dtos/environment-response.dto';

@Injectable()
export class RegenerateApiKeys {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey,
    private moduleRef: ModuleRef
  ) {}

  async execute(command: GetApiKeysCommand): Promise<IApiKeyDto[]> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new ApiException(`Environment id: ${command.environmentId} not found`);
    }

    const key = await this.generateUniqueApiKey.execute();
    const encryptedApiKey = encryptApiKey(key);
    const hashedApiKey = createHash('sha256').update(key).digest('hex');

    const environments = await this.environmentRepository.updateApiKey(
      command.environmentId,
      encryptedApiKey,
      command.userId,
      hashedApiKey
    );

    if (environment.name === 'Development') {
      this.storeDefaultTunnelUrl(command.userId, command.organizationId, command.environmentId, key);
    }

    return environments.map((item) => {
      return {
        _userId: item._userId,
        key: decryptApiKey(item.key),
      };
    });
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
