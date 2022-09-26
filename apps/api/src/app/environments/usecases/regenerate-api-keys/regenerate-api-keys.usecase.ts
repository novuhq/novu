import { Injectable } from '@nestjs/common';
import { IApiKey, EnvironmentRepository } from '@novu/dal';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { GetApiKeysCommand } from '../get-api-keys/get-api-keys.command';
import * as hat from 'hat';

@Injectable()
export class RegenerateApiKeys {
  constructor(private environmentRepository: EnvironmentRepository) {}

  async execute(command: GetApiKeysCommand): Promise<IApiKey[]> {
    const environment = await this.environmentRepository.findById(command.environmentId);

    if (!environment) {
      throw new ApiException(`Environment id: ${command.environmentId} not found`);
    }

    return await this.environmentRepository.updateApiKey(command.environmentId, hat(), command.userId);
  }
}
