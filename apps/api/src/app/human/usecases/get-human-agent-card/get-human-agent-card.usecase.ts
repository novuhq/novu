import { Injectable, NotFoundException } from '@nestjs/common';
import {
  defaultInboxDomainForProvider,
  isAgentSharedInboxEnabled,
  isValidAgentEmailSlugPrefix,
  parseAgentSharedInboxLocalPart,
  resolveAgentInboxDomain,
  resolvePublishedAgentEmailSlug,
} from '@novu/application-generic';
import {
  type AgentEntity,
  AgentIntegrationRepository,
  AgentRepository,
  type IntegrationEntity,
  IntegrationRepository,
  SubscriberRepository,
} from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import type { HumanAgentCardResult } from '../../dtos/human-agent-card.dto';
import { agentPictureUrl } from '../../services/human-agent-picture.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { HumanTelegramBotService } from '../../services/human-telegram-bot.service';
import { buildRelayOwnerCardName, resolveRelayAgentName } from '../../services/relay-owner-name';
import { GetHumanAgentCardCommand } from './get-human-agent-card.command';

/** Code on the 404 of every card that can't be shown, whatever the reason. */
export const CARD_NOT_AVAILABLE = 'card_not_available';

/** What the card reads of the agent. */
const AGENT_FIELDS = [
  '_id',
  '_environmentId',
  '_organizationId',
  'name',
  'identifier',
  'runtime',
  'active',
  'reach',
  'pausedAt',
  'picture',
  'createdAt',
] as const;

type CardAgent = Pick<AgentEntity, (typeof AGENT_FIELDS)[number]>;

/** A mailbox found by its address before the `@`. A `{slug}-{key}` address also brings the slug it was asked with. */
type FoundInbox = { integration: IntegrationEntity; keyedSlug?: string };

/**
 * The public card of the agent at `agentinbox.md/p/{handle}`, where the handle is its address before the `@`.
 * There is a card while that address takes mail for a relay agent that anyone can reach (Who can reach, on the
 * Configure page). A handle no mailbox has, a deleted or switched-off agent, and one only its contacts can reach
 * all get the same 404, so nobody can tell them apart.
 */
@Injectable()
export class GetHumanAgentCard {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly operatorService: HumanOperatorService,
    private readonly telegramBot: HumanTelegramBotService
  ) {}

  async execute(command: GetHumanAgentCardCommand): Promise<HumanAgentCardResult> {
    const { handle } = command;
    const inbox = isAgentSharedInboxEnabled() ? await this.findInbox(handle) : null;
    const agent = inbox ? await this.findAgent(inbox) : null;
    if (!inbox || !agent) {
      throw new NotFoundException({ code: CARD_NOT_AVAILABLE, message: 'This card isn’t available.' });
    }

    const [operatorName, telegramBotUsername] = await Promise.all([
      this.findOperatorName(agent),
      this.telegramBot.usernameFor(agent),
    ]);
    const pictureUrl = agentPictureUrl(agent);
    const nameFromHandle = inbox.keyedSlug ?? handle;

    return {
      handle,
      name: resolveRelayAgentName(agent) ?? nameFromHandle.charAt(0).toUpperCase() + nameFromHandle.slice(1),
      ...(pictureUrl ? { pictureUrl } : {}),
      paused: Boolean(agent.pausedAt),
      ...(operatorName ? { operatorName } : {}),
      createdAt: agent.createdAt,
      address: `${handle}@${resolveAgentInboxDomain(inbox.integration.credentials)}`,
      ...(telegramBotUsername ? { telegramBotUsername } : {}),
    };
  }

  /**
   * The Agent Inbox mailbox at this address. A handle on the Agent Inbox domain is looked up first; an address
   * made before handles could be chosen, `{slug}-{key}`, is found by its key, as inbound mail finds it.
   */
  private async findInbox(handle: string): Promise<FoundInbox | null> {
    if (isValidAgentEmailSlugPrefix(handle)) {
      const vanity = await this.integrationRepository.findAgentInboundByVanitySlug(
        handle,
        defaultInboxDomainForProvider(EmailProviderIdEnum.AgentEmailInbox)
      );
      if (vanity) {
        return { integration: vanity };
      }
    }

    const parsed = parseAgentSharedInboxLocalPart(handle);
    if (!parsed || !isValidAgentEmailSlugPrefix(parsed.slug)) {
      return null;
    }

    const keyed = await this.integrationRepository.findAgentInboundByInboxRoutingKey(parsed.inboxRoutingKey);

    return keyed?.providerId === EmailProviderIdEnum.AgentEmailInbox
      ? { integration: keyed, keyedSlug: parsed.slug }
      : null;
  }

  /** The relay agent the mailbox belongs to, while its card is public: mail reaches it, and anyone may write. */
  private async findAgent({ integration, keyedSlug }: FoundInbox): Promise<CardAgent | null> {
    if (integration.active === false || integration.credentials?.sharedInboxDisabled) {
      return null;
    }

    const scope = { _environmentId: integration._environmentId, _organizationId: integration._organizationId };
    const link = await this.agentIntegrationRepository.findOne({ _integrationId: integration._id, ...scope }, [
      '_agentId',
    ]);
    const agent = link ? await this.agentRepository.findOne({ _id: link._agentId, ...scope }, AGENT_FIELDS) : null;
    if (!agent || agent.runtime !== 'human_relay' || agent.active === false || agent.reach === 'contacts') {
      return null;
    }

    // The key found the mailbox, and the slug before it must be the one the mailbox publishes: otherwise any
    // word in front of the key would show this card.
    const publishedSlug = resolvePublishedAgentEmailSlug(integration.credentials?.emailSlugPrefix, agent);
    if (keyedSlug !== undefined && keyedSlug !== publishedSlug) {
      return null;
    }

    return agent;
  }

  /** The operator as the card names them, "Ada L.": a stranger never gets more of their last name. */
  private async findOperatorName(agent: CardAgent): Promise<string | undefined> {
    const operatorId = await this.operatorService.findForAgent({
      environmentId: agent._environmentId,
      organizationId: agent._organizationId,
      agentId: agent._id,
    });
    if (!operatorId) {
      return undefined;
    }

    const operator = await this.subscriberRepository.findOne(
      { _environmentId: agent._environmentId, subscriberId: operatorId },
      'firstName lastName'
    );

    return buildRelayOwnerCardName(operator?.firstName, operator?.lastName);
  }
}
