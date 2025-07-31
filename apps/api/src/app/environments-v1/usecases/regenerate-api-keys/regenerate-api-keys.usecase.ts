import { BadRequestException, Injectable } from '@nestjs/common';
import { decryptApiKey, encryptApiKey } from '@novu/application-generic';

import { EnvironmentRepository } from '@novu/dal';
import { createHash } from 'crypto';
import { ApiKeyDto } from '../../dtos/api-key.dto';
import { GenerateUniqueApiKey } from '../generate-unique-api-key/generate-unique-api-key.usecase';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';

@Injectable()
export class RegenerateApiKeys {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private generateUniqueApiKey: GenerateUniqueApiKey
  ) {}

  async execute(command: GetApiKeysCommand): Promise<ApiKeyDto[]> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException(`Environment id: ${command.environmentId} not found`);
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
