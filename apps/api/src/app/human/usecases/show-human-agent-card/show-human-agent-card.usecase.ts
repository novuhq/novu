import { Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  InstrumentUsecase,
  isAgentSharedInboxEnabled,
  PinoLogger,
  resolvePublishedAgentInboxAddress,
} from '@novu/application-generic';
import { type AgentEntity, AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import { resolveHumanDashboardBaseUrl } from '../../../shared/helpers/resolve-human-dashboard-base-url';
import type { ShowHumanAgentCardResponseDto } from '../../dtos/human-agent-card-shown.dto';
import { trackAgentInboxCardShown } from '../../services/agent-inbox-analytics';
import { agentLookOf } from '../../services/agent-look';
import { agentPictureUrl } from '../../services/agent-picture-url';
import { HumanHostStatusService } from '../../services/human-host-status.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { resolveRelayAgentName } from '../../services/relay-owner-name';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { ShowHumanAgentCardCommand } from './show-human-agent-card.command';

/** What showing the card reads of the agent. */
const AGENT_FIELDS = [
  '_id',
  '_environmentId',
  '_organizationId',
  'name',
  'identifier',
  'runtime',
  'active',
  'reach',
  'picture',
  'look',
] as const;

type CardAgent = Pick<AgentEntity, (typeof AGENT_FIELDS)[number]>;

/** The agent's own inbox: its address, and whether that address shows a public card. */
type OwnInbox = { address: string; handle: string; publishesCard: boolean };

/**
 * A host shows the agent's card to its operator: what the agent says, its name, address, link and look, for the
 * host to show as it can (a drawn card in ChatGPT and Claude, text elsewhere, the dotted mascot in a terminal).
 *
 * The first time any host does is kept on the agent, with the host that did. That is how the dashboard's
 * onboarding knows the agent said hi. Keeping it never fails showing the card.
 */
@Injectable()
export class ShowHumanAgentCard {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly operatorService: HumanOperatorService,
    private readonly hostStatus: HumanHostStatusService,
    private readonly analyticsService: AnalyticsService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ShowHumanAgentCardCommand): Promise<ShowHumanAgentCardResponseDto> {
    const agent = await this.findAgent(command);
    const scope = { environmentId: command.environmentId, organizationId: command.organizationId };
    const [inbox, operator] = await Promise.all([
      this.findOwnInbox(agent),
      this.operatorService.cardNameFor({ ...scope, agentId: agent._id }),
    ]);
    const firstShown = await this.keepFirstShowing(agent, command);

    if (command.hostVia) {
      // A host showing the card is connected, even when this is the first thing it did.
      await this.hostStatus.recordConnected(scope, agent._id, { via: command.hostVia, id: command.hostId });
    }

    trackAgentInboxCardShown(
      this.analyticsService,
      { userId: command.userId, organizationId: command.organizationId },
      { agentId: agent._id, source: command.analyticsSource, host: command.hostId, first: firstShown }
    );

    // As the public card names it: an agent still called what `human setup` named it goes by its handle.
    const handleName = inbox ? inbox.handle.charAt(0).toUpperCase() + inbox.handle.slice(1) : undefined;
    const name = resolveRelayAgentName(agent) ?? handleName ?? agent.name;
    const pictureUrl = agentPictureUrl(agent);
    const operatorFirstName = operator?.operatorFirstName || undefined;

    return {
      greeting: greetingOf(name, operatorFirstName),
      name,
      ...(inbox ? { handle: inbox.handle, address: inbox.address } : {}),
      ...(inbox?.publishesCard ? { url: `${resolveHumanDashboardBaseUrl()}/p/${inbox.handle}` } : {}),
      ...(pictureUrl ? { pictureUrl } : {}),
      look: agentLookOf(agent),
      ...(operatorFirstName ? { operatorFirstName } : {}),
      firstShown,
    };
  }

  private async findAgent(command: ShowHumanAgentCardCommand): Promise<CardAgent> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      AGENT_FIELDS
    );

    if (!agent || agent.runtime !== 'human_relay') {
      throw new NotFoundException('There is no agent yet. Run `npx @agentinbox/cli setup` first.');
    }

    return agent;
  }

  /**
   * The Agent Inbox mailbox linked to the agent, with the address it publishes. Its card is public at that
   * address while mail reaches the agent and anyone may write to it, as the public card page decides.
   */
  private async findOwnInbox(agent: CardAgent): Promise<OwnInbox | null> {
    if (!isAgentSharedInboxEnabled()) {
      return null;
    }

    const scope = { _environmentId: agent._environmentId, _organizationId: agent._organizationId };
    const links = await this.agentIntegrationRepository.find({ _agentId: agent._id, ...scope }, ['_integrationId']);
    if (!links.length) {
      return null;
    }

    const integration = await this.integrationRepository.findOne(
      {
        _id: { $in: links.map((link) => link._integrationId) },
        providerId: EmailProviderIdEnum.AgentEmailInbox,
        ...scope,
      },
      ['_id', 'providerId', 'credentials', 'active']
    );
    const address = integration ? resolvePublishedAgentInboxAddress(integration.credentials, agent) : undefined;
    const handle = address?.split('@')[0];
    if (!integration || !address || !handle) {
      return null;
    }

    return {
      address,
      handle,
      publishesCard: integration.active !== false && agent.active !== false && agent.reach !== 'contacts',
    };
  }

  /** Whether this showing was the first: only one request can set it, however many hosts show the card at once. */
  private async keepFirstShowing(agent: CardAgent, command: ShowHumanAgentCardCommand): Promise<boolean> {
    try {
      const { modified } = await this.agentRepository.update(
        {
          _id: agent._id,
          _environmentId: agent._environmentId,
          _organizationId: agent._organizationId,
          'cardShown.at': { $exists: false },
        },
        {
          $set: {
            cardShown: {
              at: new Date().toISOString(),
              ...(command.hostVia ? { via: command.hostVia } : {}),
              ...(command.hostId ? { host: command.hostId } : {}),
            },
          },
        },
        { timestamps: false }
      );

      return modified > 0;
    } catch (error) {
      this.logger.warn({ err: error, agentId: agent._id }, 'Failed to keep the first showing of an agent card');

      return false;
    }
  }
}

/** What the agent says as it shows its card, to its operator by their first name when it knows it. */
export function greetingOf(name: string, operatorFirstName?: string): string {
  const hello = operatorFirstName ? `Hi ${operatorFirstName}, I’m ${name}.` : `Hi, I’m ${name}.`;

  return `${hello} I have my own inbox now. Here’s my card, so people can email or message me directly.`;
}
