import { Injectable } from '@nestjs/common';
import { IntegrationEntity } from '@novu/dal';
import { GetDecryptedIntegrationsCommand } from '../get-decrypted-integrations/get-decrypted-integrations.command';
import { GetDecryptedIntegrations } from '../get-decrypted-integrations/get-decrypted-integrations.usecase';
import { GetIntegrationsCommand } from './get-integrations.command';

@Injectable()
export class GetIntegrations {
  constructor(private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations) {}

  async execute(command: GetIntegrationsCommand): Promise<IntegrationEntity[]> {
    return await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
      })
    );
  }
}
