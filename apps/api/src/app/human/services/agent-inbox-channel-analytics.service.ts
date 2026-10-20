import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import {
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

  /** Runs for a chat linked on any integration, and stops at once for anything but an Agent Inbox's channel. */
  async countLinkedChat(
    scope: Scope,
    integration: Pick<IntegrationEntity, '_id' | 'identifier' | 'providerId'>
  ): Promise<void> {
    const channel = viaForProviderId(integration.providerId);
    if (!channel || channel === HumanChannelViaEnum.EMAIL || isKeylessOrganization(scope.organizationId)) {
      return;
    }

    const query = { _environmentId: scope.environmentId, _organizationId: scope.organizationId };
    const link = await this.agentIntegrationRepository.findOne({ ...query, _integrationId: integration._id }, [
      '_agentId',
    ]);
    const agent = link && (await this.agentRepository.findOne({ ...query, _id: link._agentId }, ['_id', 'runtime']));
    if (agent?.runtime !== 'human_relay') {
      return;
    }

    // The chat just linked is one of them, so a second means the channel was connected already.
    const chats = await this.channelEndpointRepository.find(
      { ...query, integrationIdentifier: integration.identifier },
      '_id',
      { limit: 2 }
    );
    if (chats.length !== 1) {
      return;
    }

    const owner = await findAgentInboxOwner(this.environmentRepository, scope);
    if (owner) {
      trackAgentInboxChannelConnected(this.analyticsService, owner, { agentId: agent._id, channel });
    }
  }
}
