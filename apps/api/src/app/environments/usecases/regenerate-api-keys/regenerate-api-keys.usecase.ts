import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';

import { EnvironmentRepository } from '@novu/dal';
import { decryptApiKey, encryptApiKey } from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';
import { IApiKeyDto } from '../../dtos/environment-response.dto';

@Injectable()
export class RegenerateApiKeys {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey
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

    return environments.map((item) => {
      return {
        _userId: item._userId,
        key: decryptApiKey(item.key),
      };
    });
  }
}
