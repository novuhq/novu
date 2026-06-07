import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentMcpServerRepository,
  AgentRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { ChannelTypeEnum, EnvironmentTypeEnum } from '@novu/shared';
import { KEYLESS_SUBSCRIBER_ID } from '../../../inbox/utils/keyless.constants';
import { ConnectClaimTokenService } from '../../services/connect-claim-token.service';
import { ClaimKeylessConnectCommand } from './claim-keyless-connect.command';

export interface ClaimKeylessConnectResult {
  /** The Development environment the assets were merged into. */
  environmentId: string;
  /** External identifier of the claimed agent, when one was present. */
  agentIdentifier?: string;
}

@Injectable()
export class ClaimKeylessConnect {
  constructor(
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentMcpServerRepository: AgentMcpServerRepository,
    private readonly mcpConnectionRepository: McpConnectionRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(command: ClaimKeylessConnectCommand): Promise<ClaimKeylessConnectResult> {
    const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;
    if (!keylessOrganizationId) {
      throw new BadRequestException('Keyless mode is not enabled on this deployment.');
    }

    const lockAcquired = await this.connectClaimTokenService.tryAcquireClaimLock(command.token);
    if (!lockAcquired) {
      throw new ConflictException('This claim is already in progress. Please wait and try again.');
    }

    try {
      // Peek (do not consume yet) so a failed merge can be retried with the same link.
      const payload = await this.connectClaimTokenService.verify(command.token);

      if (payload.org !== keylessOrganizationId) {
        throw new BadRequestException('Invalid claim token.');
      }

      const keylessEnvironment = await this.environmentRepository.findOne({
        _id: payload.env,
        _organizationId: keylessOrganizationId,
      });
      if (!keylessEnvironment) {
        throw new NotFoundException('The keyless environment for this claim no longer exists.');
      }

      const targetEnvironment = await this.resolveDevelopmentEnvironment(command.organizationId);

      const sourceScope = { _environmentId: keylessEnvironment._id, _organizationId: keylessOrganizationId };
      const target = { _environmentId: targetEnvironment._id, _organizationId: command.organizationId };

      await this.agentRepository.withTransaction(async (session) => {
        // Agent + its links.
        await this.agentRepository.update(sourceScope, { $set: target }, { session });
        await this.agentIntegrationRepository.update(sourceScope, { $set: target }, { session });

        // Integrations — move the agent runtime + channel integrations, but skip
        // the keyless inbox in-app integration (the target Dev env already has its
        // own default integrations).
        await this.integrationRepository.update(
          { ...sourceScope, channel: { $ne: ChannelTypeEnum.IN_APP } },
          { $set: target },
          { session }
        );

        // Channel wiring for the moved channel integration.
        await this.channelConnectionRepository.update(sourceScope, { $set: target }, { session });
        await this.channelEndpointRepository.update(sourceScope, { $set: target }, { session });

        // The conversation + its full activity history (preserves continuity).
        await this.conversationRepository.update(sourceScope, { $set: target }, { session });
        await this.conversationActivityRepository.update(sourceScope, { $set: target }, { session });

        // The agent's MCP enablements + their OAuth connections (e.g. Supabase),
        // otherwise the MCPs are stranded in the keyless env and disappear.
        await this.agentMcpServerRepository.update(sourceScope, { $set: target }, { session });
        await this.mcpConnectionRepository.update(sourceScope, { $set: target }, { session });

        // The channel subscriber(s); skip the inbox demo subscriber.
        await this.subscriberRepository.update(
          { ...sourceScope, subscriberId: { $ne: KEYLESS_SUBSCRIBER_ID } },
          { $set: target },
          { session }
        );
      });

      const agent = await this.agentRepository.findOne(target, ['identifier']);

      this.logger.info(
        {
          keylessEnvironmentId: keylessEnvironment._id,
          targetEnvironmentId: targetEnvironment._id,
          organizationId: command.organizationId,
          agentIdentifier: agent?.identifier,
        },
        'Claimed keyless connect assets into Development environment'
      );

      // Consume the token only after a successful merge so partial failures stay retryable.
      await this.connectClaimTokenService.claim(command.token);

      return {
        environmentId: targetEnvironment._id,
        agentIdentifier: agent?.identifier,
      };
    } finally {
      await this.connectClaimTokenService.releaseClaimLock(command.token);
    }
  }

  private async resolveDevelopmentEnvironment(organizationId: string): Promise<EnvironmentEntity> {
    const environments = await this.environmentRepository.findOrganizationEnvironments(organizationId);

    const development =
      environments.find((env) => env.type === EnvironmentTypeEnum.DEV && !env._parentId) ??
      environments.find((env) => !env._parentId);

    if (!development) {
      throw new NotFoundException('No Development environment was found for your organization.');
    }

    return development;
  }
}
