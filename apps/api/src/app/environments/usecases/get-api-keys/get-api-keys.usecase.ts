import { Injectable } from '@nestjs/common';
import { IApiKey, EnvironmentRepository } from '@novu/dal';
import { GetApiKeysCommand } from './get-api-keys.command';

@Injectable()
export class GetApiKeys {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetApiKeysCommand): Promise<IApiKey[]> {
    return await this.environmentRepository.getApiKeys(command.environmentId);
  }
}
