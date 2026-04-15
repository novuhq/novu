import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, FeatureFlagsService } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionRepository,
  ICredentialsEntity,
  IntegrationRepository,
} from '@novu/dal';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { AgentPlatformEnum } from '../dtos/agent-platform.enum';
import { resolveAgentPlatform } from '../utils/provider-to-platform';

export interface ResolvedAgentConfig {
  platform: AgentPlatformEnum;
  credentials: ICredentialsEntity;
  connectionAccessToken?: string;
  environmentId: string;
  organizationId: string;
  agentIdentifier: string;
  integrationIdentifier: string;
  integrationId: string;
  thinkingIndicatorEnabled: boolean;
  reactionOnMessageReceived: string | null;
  reactionOnResolved: string | null;
}

const DEFAULT_REACTION_ON_MESSAGE = 'eyes';
const DEFAULT_REACTION_ON_RESOLVED = 'check';

function resolveThinkingIndicator(agent: { behavior?: { thinkingIndicatorEnabled?: boolean } }): boolean {
  return agent.behavior?.thinkingIndicatorEnabled !== false;
}

function resolveReaction(value: string | null | undefined, defaultEmoji: string): string | null {
  if (value === null) return null;
  if (value === undefined) return defaultEmoji;

  return value;
}

@Injectable()
export class AgentConfigResolver {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository
  ) {}

  async resolve(agentId: string, integrationIdentifier: string): Promise<ResolvedAgentConfig> {
    const agent = await this.agentRepository.findByIdForWebhook(agentId);
    if (!agent) {
      throw new NotFoundException(`Agent ${agentId} not found`);
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

    return {
      platform,
      credentials,
      connectionAccessToken,
      environmentId,
      organizationId,
      agentIdentifier: agent.identifier,
      integrationIdentifier,
      integrationId: integration._id,
      thinkingIndicatorEnabled: resolveThinkingIndicator(agent),
      reactionOnMessageReceived: resolveReaction(
        agent.behavior?.reactions?.onMessageReceived,
        DEFAULT_REACTION_ON_MESSAGE
      ),
      reactionOnResolved: resolveReaction(agent.behavior?.reactions?.onResolved, DEFAULT_REACTION_ON_RESOLVED),
    };
  }
}
