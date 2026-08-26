import { BadRequestException, Injectable, NotFoundException, Scope } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  DalException,
  IntegrationRepository,
} from '@novu/dal';
import { CHANNELS_WITH_PRIMARY } from '@novu/shared';

import { assertIntegrationEnvironmentScope } from '../../utils/assert-integration-environment-scope';
import { RemoveIntegrationCommand } from './remove-integration.command';

@Injectable({
  scope: Scope.REQUEST,
})
export class RemoveIntegration {
  constructor(
    private integrationRepository: IntegrationRepository,
    private agentIntegrationRepository: AgentIntegrationRepository,
    private channelEndpointRepository: ChannelEndpointRepository,
    private channelConnectionRepository: ChannelConnectionRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(RemoveIntegration.name);
  }

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

      // On standalone Mongo (no replica set) withTransaction degrades to plain
      // sequential execution, so dependents are deleted first: a partial failure
      // then leaves the integration intact and the delete retryable.
      // Subscriber channel endpoints are deleted after commit without awaiting —
      // that collection can be large, and leftover rows are ignored at send time.
      await this.agentIntegrationRepository.withTransaction(async (session) => {
        await this.channelConnectionRepository.delete(
          {
            integrationIdentifier: existingIntegration.identifier,
            _environmentId: existingIntegration._environmentId,
            _organizationId: existingIntegration._organizationId,
          },
          { session }
        );

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

      void this.channelEndpointRepository
        .delete({
          integrationIdentifier: existingIntegration.identifier,
          _environmentId: existingIntegration._environmentId,
          _organizationId: existingIntegration._organizationId,
        })
        .catch((error) => {
          this.logger.warn(
            { err: error, integrationIdentifier: existingIntegration.identifier },
            'Background channel-endpoint cleanup failed'
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
