import { Injectable } from '@nestjs/common';
import { IntegrationEntity } from '@novu/dal';
import { GetActiveIntegrationsCommand } from './get-active-integration.command';
import { GetDecryptedIntegrations } from '../get-decrypted-integrations/get-decrypted-integrations.usecase';
import { GetDecryptedIntegrationsCommand } from '../get-decrypted-integrations/get-decrypted-integrations.command';

@Injectable()
export class GetActiveIntegrations {
  constructor(private getDecryptedIntegrationsUsecase: GetDecryptedIntegrations) {}

  async execute(command: GetActiveIntegrationsCommand): Promise<IntegrationEntity[]> {
    return await this.getDecryptedIntegrationsUsecase.execute(
      GetDecryptedIntegrationsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        active: true,
      })
    );
  }
}
