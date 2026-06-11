import { BadRequestException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { AgentIntegrationRepository, DalException, IntegrationRepository } from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { assertIntegrationEnvironmentScope } from '../../utils/assert-integration-environment-scope';
import { RemoveIntegrationCommand } from './remove-integration.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class RemoveIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(command: RemoveIntegrationCommand) {
    try {
      const existingIntegration = await this.integrationRepository.findOne({
        _id: command.integrationId,
        _organizationId: command.organizationId,
      });
      if (!existingIntegration) {
        throw new NotFoundException(`Entity with id ${command.integrationId} not found`);
      }

      assertIntegrationEnvironmentScope({
        restrictToUserEnvironment: command.restrictToUserEnvironment,
        userEnvironmentId: command.environmentId,
        integrationEnvironmentId: existingIntegration._environmentId,
        action: 'delete',
      });

      // Remove agent↔integration links together with the integration so a
      // deleted integration stops counting against the active-channel plan
      // limit (and cannot be auto re-linked). On standalone Mongo (no replica
      // set) withTransaction degrades to plain sequential execution, so links
      // are deleted first: a partial failure then leaves the integration
      // intact and the delete retryable, instead of orphaning links.
      await this.agentIntegrationRepository.withTransaction(async (session) => {
        await this.agentIntegrationRepository.delete(
          {
            _integrationId: existingIntegration._id,
            _environmentId: existingIntegration._environmentId,
            _organizationId: existingIntegration._organizationId,
          },
          { session }
        );

        await this.integrationRepository.delete(
          {
            _id: existingIntegration._id,
            _organizationId: existingIntegration._organizationId,
          },
          { session }
        );
      });

      const { channel } = existingIntegration;
      const isChannelSupportsPrimary = !!channel && CHANNELS_WITH_PRIMARY.includes(channel);
      if (isChannelSupportsPrimary) {
        await this.integrationRepository.recalculatePriorityForAllActive({
          _organizationId: existingIntegration._organizationId,
          _environmentId: existingIntegration._environmentId,
          channel,
        });
      }
    } catch (e) {
      if (e instanceof DalException) {
        throw new BadRequestException(e.message);
      }
      throw e;
    }

    return await this.integrationRepository.find({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });
  }
}
