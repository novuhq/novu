import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  ChannelConnectionRepository,
  ChannelEndpointRepository,
  ConversationActivityRepository,
  ConversationRepository,
  DomainRouteRepository,
  HumanContactRepository,
  HumanInteractionRepository,
  IntegrationRepository,
} from '@novu/dal';
import { ChannelTypeEnum } from '@novu/shared';
import { HumanAgentPictureService } from '../../services/human-agent-picture.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { DeleteHumanAgentCommand } from './delete-human-agent.command';

type Scope = { _environmentId: string; _organizationId: string };

type OwnChannels = { ids: string[]; identifiers: string[] };

/**
 * Deletes the relay agent for good, so the account is back to having no agent and its address can be taken
 * again: the agent, its channels (its email address, Telegram bot and Slack app, with their credentials, the
 * chats contacts linked on them and the Slack workspace connection), its conversations with their messages,
 * its questions, its picture, and what it kept about each contact (default channel, verified addresses).
 *
 * Hosts lose it with the agent: their last checks are kept on it, and a one-time code made for it no longer
 * connects (`ConnectHost` looks the agent up). Its invite links stop working the same way.
 *
 * Stays: the contacts themselves, the account, its key, and the operator's own contact record, so the
 * operator is still "you" when they set up the next agent. A channel another agent also uses stays too,
 * only unlinked from this one.
 *
 * Everything is removed in one transaction, like deleting a Human account.
 */
@Injectable()
export class DeleteHumanAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly conversationActivityRepository: ConversationActivityRepository,
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly humanAgentPicture: HumanAgentPictureService
  ) {}

  @InstrumentUsecase()
  async execute(command: DeleteHumanAgentCommand): Promise<void> {
    const scope: Scope = { _environmentId: command.environmentId, _organizationId: command.organizationId };
    const agent = await this.agentRepository.findOne(
      { ...scope, identifier: command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER },
      ['_id', 'runtime', 'picture']
    );

    if (!agent || agent.runtime !== 'human_relay') {
      throw new NotFoundException('There is no agent yet. Run `npx @agentinbox/cli setup` first.');
    }

    // Read before the delete: afterwards nothing tells which channels and conversations were the agent's.
    const channels = await this.findOwnChannels(scope, agent._id);
    const conversations = await this.conversationRepository.find({ ...scope, _agentId: agent._id }, ['_id']);
    const conversationIds = conversations.map((conversation) => conversation._id);

    await this.agentRepository.withTransaction(async (session) => {
      // One after the other: operations of a transaction can't run in parallel.
      await this.humanInteractionRepository.delete({ ...scope, _agentId: agent._id }, { session });
      await this.humanContactRepository.delete(
        { ...scope, _agentId: agent._id, isOperator: { $ne: true } },
        { session }
      );

      if (conversationIds.length > 0) {
        await this.conversationActivityRepository.delete(
          { ...scope, _conversationId: { $in: conversationIds } },
          { session }
        );
      }
      await this.conversationRepository.delete({ ...scope, _agentId: agent._id }, { session });

      if (channels.identifiers.length > 0) {
        await this.channelEndpointRepository.delete(
          { ...scope, integrationIdentifier: { $in: channels.identifiers } },
          { session }
        );
        await this.channelConnectionRepository.delete(
          { ...scope, integrationIdentifier: { $in: channels.identifiers } },
          { session }
        );
      }

      if (channels.ids.length > 0) {
        // On the model: the repository would only mark them as deleted and keep the bot tokens, the secrets
        // and the email address.
        await this.integrationRepository._model.deleteMany(
          { ...scope, _id: { $in: channels.ids }, channel: { $ne: ChannelTypeEnum.IN_APP } },
          session ? { session } : {}
        );
      }

      await this.domainRouteRepository.removeByDestination(command.environmentId, command.organizationId, agent._id, {
        session,
      });
      await this.agentIntegrationRepository.delete({ ...scope, _agentId: agent._id }, { session });
      await this.agentRepository.delete({ ...scope, _id: agent._id }, { session });
    });

    await this.humanAgentPicture.forget(agent);
  }

  /**
   * The channels linked to the agent, or once linked and disconnected, that no other agent uses: their ids,
   * and the identifiers of those not deleted yet, which their chats and connections are kept under. A link
   * that was disconnected is skipped by a plain find, so it is asked for on its own.
   */
  private async findOwnChannels(scope: Scope, agentId: string): Promise<OwnChannels> {
    const [links, disconnectedLinks] = await Promise.all([
      this.agentIntegrationRepository.find({ ...scope, _agentId: agentId }, ['_integrationId']),
      this.agentIntegrationRepository.find({ ...scope, _agentId: agentId, disconnectedAt: { $ne: null } }, [
        '_integrationId',
      ]),
    ]);
    const linkedIds = [...new Set([...links, ...disconnectedLinks].map((link) => String(link._integrationId)))];

    if (linkedIds.length === 0) {
      return { ids: [], identifiers: [] };
    }

    const usedElsewhere = await this.agentIntegrationRepository.find(
      { ...scope, _integrationId: { $in: linkedIds }, _agentId: { $ne: agentId } },
      ['_integrationId']
    );
    const sharedIds = new Set(usedElsewhere.map((link) => String(link._integrationId)));
    const ids = linkedIds.filter((id) => !sharedIds.has(id));

    if (ids.length === 0) {
      return { ids: [], identifiers: [] };
    }

    const integrations = await this.integrationRepository.find(
      { ...scope, _id: { $in: ids }, channel: { $ne: ChannelTypeEnum.IN_APP } },
      'identifier'
    );

    return { ids, identifiers: integrations.map((integration) => integration.identifier) };
  }
}
