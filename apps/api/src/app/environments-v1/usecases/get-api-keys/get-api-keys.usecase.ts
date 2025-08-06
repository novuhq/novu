import { Injectable } from '@nestjs/common';
import { decryptApiKey } from '@novu/application-generic';
import { EnvironmentRepository, IApiKey } from '@novu/dal';
import { ApiKey } from '../../../shared/dtos/api-key';
import { GetApiKeysCommand } from './get-api-keys.command';

@Injectable()
export class GetApiKeys {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetApiKeysCommand): Promise<ApiKey[]> {
    const keys = await this.environmentRepository.getApiKeys(command.environmentId);

    return keys.map((apiKey: IApiKey) => {
      return {
        key: decryptApiKey(apiKey.key),
        _userId: apiKey._userId,
      };
    });
  }
}
