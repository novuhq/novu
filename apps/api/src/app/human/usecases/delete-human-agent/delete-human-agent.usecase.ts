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
import { ChannelTypeEnum, HumanChannelViaEnum } from '@novu/shared';
import { HumanAgentPictureService } from '../../services/human-agent-picture.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { DeleteHumanAgentCommand } from './delete-human-agent.command';

type Scope = { _environmentId: string; _organizationId: string };

type OwnChannels = { ids: string[]; identifiers: string[] };

/** Every confirmation link that can be out for a contact's address, one per channel. */
const PENDING_ADDRESSES = Object.fromEntries(
  Object.values(HumanChannelViaEnum).map((via) => [`addresses.${via}.pending`, 1])
);

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
 * operator is still "you" when they set up the next agent; a confirmation link still out for their address
 * stops working, though. A channel another agent also uses stays too, only unlinked from this one.
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

    // Read before the delete: afterwards nothing tells which channels were the agent's.
    const channels = await this.findOwnChannels(scope, agent._id);

    await this.agentRepository.withTransaction(async (session) => {
      // One after the other: operations of a transaction can't run in parallel. The conversations are read
      // in the transaction, so the messages deleted are those of exactly the conversations deleted below.
      const conversations = await this.conversationRepository.find({ ...scope, _agentId: agent._id }, ['_id'], {
        session,
      });
      const conversationIds = conversations.map((conversation) => conversation._id);

      await this.humanInteractionRepository.delete({ ...scope, _agentId: agent._id }, { session });
      await this.humanContactRepository.delete(
        { ...scope, _agentId: agent._id, isOperator: { $ne: true } },
        { session }
      );
      // A confirmation link sent for this agent would otherwise still change the operator's email later.
      await this.humanContactRepository.update(
        { ...scope, _agentId: agent._id, isOperator: true },
        { $unset: PENDING_ADDRESSES },
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
   * The channels linked to the agent, or once linked and disconnected, that no other agent uses, linked or
   * disconnected (a disconnected link can be revived): their ids, and the identifiers of those not deleted
   * yet, which their chats and connections are kept under. A plain find skips disconnected links, so they
   * are asked for on their own.
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

    const otherAgents = { ...scope, _integrationId: { $in: linkedIds }, _agentId: { $ne: agentId } };
    const [usedElsewhere, disconnectedElsewhere] = await Promise.all([
      this.agentIntegrationRepository.find(otherAgents, ['_integrationId']),
      this.agentIntegrationRepository.find({ ...otherAgents, disconnectedAt: { $ne: null } }, ['_integrationId']),
    ]);
    const sharedIds = new Set([...usedElsewhere, ...disconnectedElsewhere].map((link) => String(link._integrationId)));
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
