import { Injectable } from '@nestjs/common';
import { IApiKey, ApplicationRepository } from '@notifire/dal';
import { GetApiKeysCommand } from './get-api-keys.command';

@Injectable()
export class GetApiKeys {
  constructor(private applicationRepository: ApplicationRepository) {}

  async execute(command: GetApiKeysCommand): Promise<IApiKey[]> {
    return await this.applicationRepository.getApiKeys(command.applicationId);
  }
}
