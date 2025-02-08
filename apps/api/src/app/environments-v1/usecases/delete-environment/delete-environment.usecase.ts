import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { EnvironmentEnum, PROTECTED_ENVIRONMENTS } from '@novu/shared';
import { RemoveIntegrationCommand } from '../../../integrations/usecases/remove-integration/remove-integration.command';
import { RemoveIntegration } from '../../../integrations/usecases/remove-integration/remove-integration.usecase';
import { DeleteEnvironmentCommand } from './delete-environment.command';

@Injectable()
export class DeleteEnvironment {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private removeIntegration: RemoveIntegration,
    private integrationRepository: IntegrationRepository
  ) {}

  async execute(command: DeleteEnvironmentCommand): Promise<void> {
    const environment = await this.environmentRepository.findOne({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!environment) {
      throw new NotFoundException(`Environment ${command.environmentId} not found`);
    }

    if (PROTECTED_ENVIRONMENTS.includes(environment.name as EnvironmentEnum)) {
      throw new BadRequestException(
        `The ${environment.name} environment is protected and cannot be deleted. Only custom environments can be deleted.`
      );
    }

    await this.environmentRepository.delete({
      _id: command.environmentId,
      _organizationId: command.organizationId,
    });

    const integrations = await this.integrationRepository.find({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    for (const integration of integrations) {
      await this.removeIntegration.execute(
        RemoveIntegrationCommand.create({
          organizationId: command.organizationId,
          integrationId: integration._id,
          userId: command.userId,
          environmentId: command.environmentId,
        })
      );
    }
  }
}
