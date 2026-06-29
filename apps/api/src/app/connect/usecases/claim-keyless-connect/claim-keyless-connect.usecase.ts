import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
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
import {
  ConnectClaimTokenCacheUnavailableError,
  ConnectClaimTokenService,
  InvalidConnectClaimTokenError,
} from '../../services/connect-claim-token.service';
import { ClaimKeylessConnectCommand } from './claim-keyless-connect.command';

export interface ClaimKeylessConnectResult {
  environmentId: string;
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
      let payload;
      try {
        payload = await this.connectClaimTokenService.verify(command.token);
      } catch (error) {
        this.rethrowConnectClaimTokenError(error);
      }

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

      const sourceAgents = await this.agentRepository.find(sourceScope, ['_id', 'identifier']);

      await this.agentRepository.withTransaction(async (session) => {
        await this.agentRepository.update(sourceScope, { $set: target }, { session });
        await this.agentIntegrationRepository.update(sourceScope, { $set: target }, { session });
        await this.integrationRepository.update(
          { ...sourceScope, channel: { $ne: ChannelTypeEnum.IN_APP } },
          { $set: target },
          { session }
        );
        await this.channelConnectionRepository.update(sourceScope, { $set: target }, { session });
        await this.channelEndpointRepository.update(sourceScope, { $set: target }, { session });
        await this.conversationRepository.update(sourceScope, { $set: target }, { session });
        await this.conversationActivityRepository.update(sourceScope, { $set: target }, { session });
        await this.agentMcpServerRepository.update(sourceScope, { $set: target }, { session });
        await this.mcpConnectionRepository.update(sourceScope, { $set: target }, { session });
        await this.subscriberRepository.update(
          { ...sourceScope, subscriberId: { $ne: KEYLESS_SUBSCRIBER_ID } },
          { $set: target },
          { session }
        );
      });

      const migratedAgentId = sourceAgents[0]?._id;
      const agent = migratedAgentId
        ? await this.agentRepository.findOne({ _id: migratedAgentId, ...target }, ['identifier'])
        : null;

      this.logger.info(
        {
          keylessEnvironmentId: keylessEnvironment._id,
          targetEnvironmentId: targetEnvironment._id,
          organizationId: command.organizationId,
          agentIdentifier: agent?.identifier,
        },
        'Claimed keyless connect assets into Development environment'
      );

      try {
        await this.connectClaimTokenService.claim(command.token);
      } catch (error) {
        this.rethrowConnectClaimTokenError(error);
      }

      return {
        environmentId: targetEnvironment._id,
        agentIdentifier: agent?.identifier,
      };
    } finally {
      await this.connectClaimTokenService.releaseClaimLock(command.token);
    }
  }

  private rethrowConnectClaimTokenError(error: unknown): never {
    if (error instanceof InvalidConnectClaimTokenError) {
      if (error.reason === 'used') {
        throw new BadRequestException('This claim link has already been used.');
      }

      if (error.reason === 'expired') {
        throw new BadRequestException('This claim link has expired.');
      }

      throw new BadRequestException('Invalid claim token.');
    }

    if (error instanceof ConnectClaimTokenCacheUnavailableError) {
      throw new ServiceUnavailableException('Claim service is temporarily unavailable. Please try again.');
    }

    throw error;
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
