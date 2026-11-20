import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import {
  type AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  ChannelEndpointRepository,
  EnvironmentRepository,
  type IntegrationEntity,
} from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { isKeylessOrganization } from '../../keyless/keyless-organization.helpers';
import { findAgentInboxOwner, trackAgentInboxChannelConnected } from './agent-inbox-analytics';
import { viaForProviderId } from './human-channel-via';

type Scope = { environmentId: string; organizationId: string };

/**
 * Counts an Agent Inbox's Telegram or Slack channel as connected once it works: the first time someone links
 * their chat on it, which is also when the dashboard starts showing it connected. Setting the channel up isn't
 * enough, since Telegram or Slack can turn the bot down or the install can stop halfway. Email works as soon as
 * the agent has its address, so it is counted where the address is made.
 */
@Injectable()
export class AgentInboxChannelAnalytics {
  constructor(
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly analyticsService: AnalyticsService
  ) {}

  /**
   * Runs for each chat linked on any integration, and stops at once for anything but an Agent Inbox's channel.
   * `chatId` is the channel endpoint just made for the chat.
   */
  async countLinkedChat(
    scope: Scope,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'providerId'>,
    chatId: string
  ): Promise<void> {
    const channel = viaForProviderId(integration.providerId);
    if (!channel || channel === HumanChannelViaEnum.EMAIL || isKeylessOrganization(scope.organizationId)) {
      return;
    }

    const query = { _environmentId: scope.environmentId, _organizationId: scope.organizationId };
    const agent = await this.findRelayAgent(query, integration._id);
    if (!agent) {
      return;
    }

    // Only the channel's first chat connects it. Chats linked at the same moment all see each other, but only
    // one of them is the oldest, so exactly one counts.
    const [firstChat] = await this.channelEndpointRepository.find(
      { ...query, integrationIdentifier: integration.identifier },
      '_id',
      { sort: { _id: 1 }, limit: 1 }
    );
    if (!firstChat || String(firstChat._id) !== String(chatId)) {
      return;
    }

    const owner = await findAgentInboxOwner(this.environmentRepository, scope);
    if (owner) {
      trackAgentInboxChannelConnected(this.analyticsService, owner, { agentId: agent._id, channel });
    }
  }

  /** The Agent Inbox agent the integration is linked to. A Slack app can be linked to other agents as well. */
  private async findRelayAgent(
    query: { _environmentId: string; _organizationId: string },
    integrationId: string
  ): Promise<Pick<AgentEntity, '_id'> | null> {
    const links = await this.agentIntegrationRepository.find({ ...query, _integrationId: integrationId }, ['_agentId']);
    const agentIds = links.flatMap((link) => (link._agentId ? [link._agentId] : []));
    if (agentIds.length === 0) {
      return null;
    }

    return this.agentRepository.findOne({ ...query, _id: { $in: agentIds }, runtime: 'human_relay' }, ['_id']);
  }
}
