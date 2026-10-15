import { createHash, randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AnalyticsService, CacheService, encryptApiKey, PinoLogger } from '@novu/application-generic';
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
  HumanContactRepository,
  HumanInteractionRepository,
  IntegrationRepository,
  McpConnectionRepository,
  SubscriberRepository,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  EnvironmentTypeEnum,
  HumanChannelViaEnum,
  isConnectClaimTokenFormat,
  SIGNUP_ANALYTICS_EVENTS,
} from '@novu/shared';
import { KEYLESS_SUBSCRIBER_ID } from '../../../inbox/utils/keyless.constants';
import { isKeylessAgentEnvironment } from '../../../keyless/keyless-agent-environment';
import { resolveKeylessAttribution } from '../../../keyless/keyless-signup-analytics';
import {
  ConnectClaimTokenCacheUnavailableError,
  ConnectClaimTokenService,
  InvalidConnectClaimTokenError,
} from '../../services/connect-claim-token.service';
import { ClaimKeylessConnectCommand } from './claim-keyless-connect.command';
import { ClaimKeylessConnectHooks, ClaimLinkErrorCodeEnum } from './claim-keyless-connect.types';

export interface ClaimKeylessConnectResult {
  environmentId: string;
  agentIdentifier?: string;
}

const MINUTE_MS = 60 * 1000;

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
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly cacheService: CacheService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(
    command: ClaimKeylessConnectCommand,
    hooks: ClaimKeylessConnectHooks = {}
  ): Promise<ClaimKeylessConnectResult> {
    const keylessOrganizationId = process.env.KEYLESS_ORGANIZATION_ID;
    if (!keylessOrganizationId) {
      throw new BadRequestException('Keyless mode is not enabled on this deployment.');
    }

    if (!isConnectClaimTokenFormat(command.token)) {
      throw claimLinkError('Invalid claim token.', ClaimLinkErrorCodeEnum.INVALID);
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
        throw claimLinkError('Invalid claim token.', ClaimLinkErrorCodeEnum.INVALID);
      }

      const keylessEnvironment = await this.environmentRepository.findOne({
        _id: payload.env,
        _organizationId: keylessOrganizationId,
      });
      if (!keylessEnvironment) {
        throw new NotFoundException('The keyless environment for this claim no longer exists.');
      }

      if (!hooks.beforeMove && isKeylessAgentEnvironment(keylessEnvironment)) {
        throw claimLinkError(
          'This link claims a keyless environment. Open it in the Novu dashboard to claim it.',
          ClaimLinkErrorCodeEnum.REQUIRES_ENVIRONMENT_CLAIM
        );
      }

      const targetEnvironment = await this.resolveDevelopmentEnvironment(command.organizationId);

      const sourceScope = { _environmentId: keylessEnvironment._id, _organizationId: keylessOrganizationId };
      const target = { _environmentId: targetEnvironment._id, _organizationId: command.organizationId };

      const sourceAgents = await this.agentRepository.find(sourceScope, ['_id', 'identifier']);
      await this.assertNoAgentIdentifierClash(sourceAgents, target);
      await this.assertOperatorEmailVerified(keylessEnvironment._id);

      const moveOptions = (await hooks.beforeMove?.({ keylessEnvironment, targetEnvironment })) ?? {};
      const excludedProviderIds = moveOptions.excludeIntegrationProviderIds ?? [];

      await this.moveIntoTarget(async (session) => {
        await this.agentRepository.update(sourceScope, { $set: target }, { session });
        await this.agentIntegrationRepository.update(sourceScope, { $set: target }, { session });
        await this.integrationRepository.update(
          {
            ...sourceScope,
            channel: { $ne: ChannelTypeEnum.IN_APP },
            ...(excludedProviderIds.length > 0 && { providerId: { $nin: excludedProviderIds } }),
          },
          { $set: target },
          { session }
        );
        await this.channelConnectionRepository.update(sourceScope, { $set: target }, { session });
        await this.channelEndpointRepository.update(sourceScope, { $set: target }, { session });
        await this.conversationRepository.update(sourceScope, { $set: target }, { session });
        await this.conversationActivityRepository.update(sourceScope, { $set: target }, { session });
        await this.agentMcpServerRepository.update(sourceScope, { $set: target }, { session });
        await this.mcpConnectionRepository.update(sourceScope, { $set: target }, { session });
        await this.humanInteractionRepository.update(sourceScope, { $set: target }, { session });
        await this.humanContactRepository.update(sourceScope, { $set: target }, { session });
        await this.subscriberRepository.update(
          { ...sourceScope, subscriberId: { $ne: KEYLESS_SUBSCRIBER_ID } },
          { $set: target },
          { session }
        );

        if (moveOptions.revokeKeylessApiKeys) {
          const keyOwnerId = keylessEnvironment.apiKeys?.[0]?._userId ?? command.userId;
          await this.environmentRepository.update(
            { _id: keylessEnvironment._id, _organizationId: keylessOrganizationId },
            { $set: { apiKeys: [buildUnusableApiKey(keyOwnerId)] } },
            { session }
          );
        }
      });
      hooks.onMoveCommitted?.();

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

      await this.trackClaimed(command, keylessEnvironment, targetEnvironment, moveOptions.claimedEventProperties);

      return {
        environmentId: targetEnvironment._id,
        agentIdentifier: agent?.identifier,
      };
    } finally {
      await this.connectClaimTokenService.releaseClaimLock(command.token);
    }
  }

  /** Runs after the token was consumed, so it fires once per successful claim and never fails it. */
  private async trackClaimed(
    command: ClaimKeylessConnectCommand,
    keylessEnvironment: EnvironmentEntity,
    targetEnvironment: EnvironmentEntity,
    extraProperties: Record<string, string | number> = {}
  ): Promise<void> {
    try {
      const attribution = await resolveKeylessAttribution(this.cacheService, keylessEnvironment);
      const createdAt = keylessEnvironment.createdAt ? new Date(keylessEnvironment.createdAt).getTime() : undefined;

      this.analyticsService.mixpanelTrack(SIGNUP_ANALYTICS_EVENTS.KEYLESS_ENVIRONMENT_CLAIMED, keylessEnvironment._id, {
        ...extraProperties,
        source: command.source ?? attribution.source,
        ...(attribution.client && { client: attribution.client }),
        environmentId: keylessEnvironment._id,
        targetOrganizationId: command.organizationId,
        targetEnvironmentId: targetEnvironment._id,
        ...(createdAt !== undefined && { ageMinutes: Math.floor((Date.now() - createdAt) / MINUTE_MS) }),
      });
      this.analyticsService.alias(keylessEnvironment._id, command.userId);
    } catch (error) {
      this.logger.warn(
        { err: error, keylessEnvironmentId: keylessEnvironment._id },
        'Failed to record keyless environment claim analytics'
      );
    }
  }

  /**
   * A verification link names the keyless environment. Claiming first moves the
   * pending contact, and that link can no longer find it. Verify, then claim.
   */
  private async assertOperatorEmailVerified(environmentId: string): Promise<void> {
    const operator = await this.humanContactRepository.findOperatorInEnvironment(environmentId);
    const email = operator?.addresses?.[HumanChannelViaEnum.EMAIL];

    if (!email?.pending || email.verified) {
      return;
    }

    throw new ConflictException({
      message:
        'Verify your email before claiming this setup. Open the verification message and confirm the address, then use this link again.',
      code: 'verify_email_before_claim',
    });
  }

  /**
   * Agent identifiers are unique per environment, so a target that already has one of the claimed agents
   * (e.g. a second keyless `human-relay` claimed into the same account) can't take this setup.
   */
  private async assertNoAgentIdentifierClash(
    sourceAgents: Array<{ identifier: string }>,
    target: { _environmentId: string; _organizationId: string }
  ): Promise<void> {
    if (sourceAgents.length === 0) {
      return;
    }

    const clash = await this.agentRepository.findOne(
      { ...target, identifier: { $in: sourceAgents.map((agent) => agent.identifier) } },
      ['identifier']
    );

    if (clash) {
      throw new ConflictException({
        message: `Your Development environment already has an agent called "${clash.identifier}", so this setup can't be added to it.`,
        code: 'claim_agent_exists',
      });
    }
  }

  private async moveIntoTarget(move: Parameters<AgentRepository['withTransaction']>[0]): Promise<void> {
    try {
      await this.agentRepository.withTransaction(move);
    } catch (error) {
      if ((error as { code?: number })?.code === 11000) {
        throw new ConflictException({
          message: 'Part of this setup already exists in your Development environment.',
          code: 'claim_conflict',
        });
      }

      throw error;
    }
  }

  private rethrowConnectClaimTokenError(error: unknown): never {
    if (error instanceof InvalidConnectClaimTokenError) {
      if (error.reason === 'used') {
        throw claimLinkError('This claim link has already been used.', ClaimLinkErrorCodeEnum.USED);
      }

      if (error.reason === 'expired') {
        throw claimLinkError('This claim link has expired.', ClaimLinkErrorCodeEnum.EXPIRED);
      }

      throw claimLinkError('Invalid claim token.', ClaimLinkErrorCodeEnum.INVALID);
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

function claimLinkError(message: string, code: ClaimLinkErrorCodeEnum): BadRequestException {
  // Keeps the `error` field Nest adds for string messages, so existing response bodies only gain `code`.
  return new BadRequestException({ message, error: 'Bad Request', code });
}

/**
 * `apiKeys.key` is uniquely indexed and an empty array indexes as null, so only one environment could ever have
 * no keys. Revoke by swapping in a key whose secret is discarded instead.
 */
function buildUnusableApiKey(userId: string): { key: string; hash: string; _userId: string } {
  const secret = randomBytes(32).toString('hex');

  return {
    key: encryptApiKey(secret),
    hash: createHash('sha256').update(secret).digest('hex'),
    _userId: userId,
  };
}
