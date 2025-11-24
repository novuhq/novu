import { BadRequestException, Injectable } from '@nestjs/common';
import { decryptApiKey, encryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { createHash } from 'crypto';
import { ApiKeyDto } from '../../dtos/api-key.dto';
import { UpdateApiKeyCommand } from './update-api-key.command';

@Injectable()
export class UpdateApiKey {
  constructor(
    private environmentRepository: EnvironmentRepository,
  ) {}

  async execute(command: UpdateApiKeyCommand): Promise<ApiKeyDto[]> {
    const environment = await this.environmentRepository.findOne({ _id: command.environmentId });

    if (!environment) {
      throw new BadRequestException(`Environment id: ${command.environmentId} not found`);
    }

    const key = command.apiKey;
    if (key.length < 32) {
      throw new BadRequestException(`API key must be at least 32 characters long`);
    }

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
