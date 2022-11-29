import { Injectable } from '@nestjs/common';
import { IntegrationEntity } from '@novu/dal';
import { GetIntegrationsCommand } from './get-integrations.command';
import { GetDecryptedIntegrationsCommand } from '../get-decrypted-integrations/get-decrypted-integrations.command';
import { GetDecryptedIntegrations } from '../get-decrypted-integrations/get-decrypted-integrations.usecase';

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
