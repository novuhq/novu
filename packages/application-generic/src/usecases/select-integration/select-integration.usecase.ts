import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { SelectIntegrationCommand } from './select-integration.command';

@Injectable()
export class SelectIntegration {
  constructor(private integrationRepository: IntegrationRepository) {}

  async execute(command: SelectIntegrationCommand) {
    const query: Partial<IntegrationEntity> & {
      _organizationId: string;
    } = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    };
    // TODO: Validate inputs for conditions once we have the conditions

    if (command.workflowIdentifier) {
      query.identifier = command.workflowIdentifier;
    }

    if (command.workflowName) {
      query.name = command.workflowName;
    }

    // TODO: update this to use conditions to query integrations
    const integrations = await this.integrationRepository.find(query);

    return integrations;
  }
}
