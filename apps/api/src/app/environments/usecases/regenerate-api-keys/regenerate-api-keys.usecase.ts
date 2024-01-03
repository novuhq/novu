import { Injectable } from '@nestjs/common';

import { IApiKey, EnvironmentRepository } from '@novu/dal';
import { encryptApiKey } from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';

@Injectable()
export class RegenerateApiKeys {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey
  ) {}

  async execute(command: GetApiKeysCommand): Promise<IApiKey[]> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new ApiException(`Environment id: ${command.environmentId} not found`);
    }

    const key = await this.generateUniqueApiKey.execute();
    const encryptedApiKey = encryptApiKey(key);

    return await this.environmentRepository.updateApiKey(command.environmentId, encryptedApiKey, command.userId);
  }
}
