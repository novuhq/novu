import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { AnalyticsService, decryptCredentials, FeatureFlagsService, PinoLogger } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionRepository,
  ICredentialsEntity,
  IntegrationRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import type { WellKnownEmoji } from 'chat';
import { trackAgentIntegrationFirstWebhook } from '../agent-analytics';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { AgentInactiveException } from '../exceptions/agent-inactive.exception';
import { esmImport } from '../utils/esm-import';
import { resolveAgentPlatform } from '../utils/provider-to-platform';

let cachedEmojiNames: Set<string> | null = null;

async function loadEmojiNames(): Promise<Set<string>> {
  if (cachedEmojiNames) return cachedEmojiNames;

  const { DEFAULT_EMOJI_MAP } = await esmImport('chat');
  cachedEmojiNames = new Set<string>(Object.keys(DEFAULT_EMOJI_MAP));

  return cachedEmojiNames;
}

export interface ResolvedAgentConfig {
  platform: AgentPlatformEnum;
  credentials: ICredentialsEntity;
  connectionAccessToken?: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  integrationId: string;
  acknowledgeOnReceived: boolean;
  reactionOnResolved: WellKnownEmoji | null;
  bridgeUrl?: string;
  devBridgeUrl?: string;
  devBridgeActive?: boolean;
}

const DEFAULT_REACTION_ON_RESOLVED: WellKnownEmoji = 'check';

async function resolveReaction(
  value: string | null | undefined,
  defaultEmoji: WellKnownEmoji,
  log: PinoLogger
): Promise<WellKnownEmoji | null> {
  if (value === null) return null;
  if (value === undefined) return defaultEmoji;

  const known = await loadEmojiNames();
  if (!known.has(value)) {
    log.warn(`Unknown emoji "${value}" in agent config, falling back to default "${defaultEmoji}"`);

    return defaultEmoji;
  }

  return value as WellKnownEmoji;
}

@Injectable()
export class AgentConfigResolver {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly logger: PinoLogger,
    private readonly analyticsService: AnalyticsService
  ) {}

  async resolve(agentId: string, integrationIdentifier: string): Promise<ResolvedAgentConfig> {
    const agent = await this.agentRepository.findByIdForWebhook(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
    }

    if (agent.active === false) {
      throw new AgentInactiveException(agentId);
    }

    const { _environmentId: environmentId, _organizationId: organizationId } = agent;

    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_CONVERSATIONAL_AGENTS_ENABLED,
      defaultValue: false,
      environment: { _id: environmentId },
      organization: { _id: organizationId },
    });
    if (!isEnabled) {
      throw new NotFoundException();
    }

    const integration = await this.integrationRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      identifier: integrationIdentifier,
    });
    if (!integration) {
      throw new NotFoundException(`Integration ${integrationIdentifier} not found for agent ${agentId}`);
    }

    const agentIntegration = await this.agentIntegrationRepository.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
        _integrationId: integration._id,
      },
      '*'
    );
    if (!agentIntegration) {
      throw new UnprocessableEntityException(`Agent ${agentId} is not linked to integration ${integrationIdentifier}`);
    }

    const platform = resolveAgentPlatform(integration.providerId);
    if (!platform) {
      throw new UnprocessableEntityException(
        `Provider ${integration.providerId} is not supported as an agent platform`
      );
    }

    const credentials = decryptCredentials(integration.credentials);

    let connectionAccessToken: string | undefined;
    const connection = await this.channelConnectionRepository.findOne({
      _environmentId: environmentId,
      _organizationId: organizationId,
      integrationIdentifier,
    });
    if (connection) {
      connectionAccessToken = connection.auth.accessToken;
    }

    const hadConnectedAt = Boolean(agentIntegration.connectedAt);

    if (!hadConnectedAt) {
      await this.agentIntegrationRepository.updateOne(
        {
          _id: agentIntegration._id,
          _environmentId: environmentId,
          _organizationId: organizationId,
        },
        { $set: { connectedAt: new Date() } }
      );

      trackAgentIntegrationFirstWebhook(this.analyticsService, {
        organizationId,
        environmentId,
        agentId,
        agentIdentifier: agent.identifier,
        integrationIdentifier,
        platform,
      });
    }

    return {
      platform,
      credentials,
      connectionAccessToken,
      environmentId,
      organizationId,
      agentIdentifier: agent.identifier,
      integrationIdentifier,
      integrationId: integration._id,
      acknowledgeOnReceived: agent.behavior?.acknowledgeOnReceived !== false,
      reactionOnResolved: await resolveReaction(
        agent.behavior?.reactionOnResolved,
        DEFAULT_REACTION_ON_RESOLVED,
        this.logger
      ),
      bridgeUrl: agent.bridgeUrl,
      devBridgeUrl: agent.devBridgeUrl,
      devBridgeActive: agent.devBridgeActive,
    };
  }
}
