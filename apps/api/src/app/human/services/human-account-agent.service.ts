import { Injectable } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  HumanContactRepository,
  HumanInteractionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { SetupHumanRelayCommand } from '../usecases/setup-human-relay/setup-human-relay.command';
import {
  DEFAULT_HUMAN_RELAY_IDENTIFIER,
  SetupHumanRelay,
} from '../usecases/setup-human-relay/setup-human-relay.usecase';
import { trackAgentInboxChannelConnected, trackAgentInboxCreated } from './agent-inbox-analytics';
import { HumanDeliveryService } from './human-delivery.service';
import { HumanOperatorService } from './human-operator.service';

type AccountScope = { environmentId: string; organizationId: string; userId: string };
type OperatorName = { firstName?: string; lastName?: string };
type UntouchedAgent = { agentId: string; operator: string | null };
/** What a claim reports back: the agent it brought, when it brought one. */
type ClaimedSetup = { agentIdentifier?: string };

/**
 * The relay agent of a Human account, and what happens to it when the operator brings a setup made
 * without an account: an agent nobody has used yet steps aside for the one being claimed, an agent in
 * use stays and the claim is refused as before.
 *
 * An account starts without an agent; `human setup` makes it. Accounts from before that got one at
 * sign-up, which is where most untouched agents come from.
 */
@Injectable()
export class HumanAccountAgentService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanOperator: HumanOperatorService,
    private readonly setupHumanRelay: SetupHumanRelay,
    private readonly deliveryService: HumanDeliveryService,
    private readonly analyticsService: AnalyticsService
  ) {}

  /**
   * Gives the account its relay agent and the operator's contact. Safe to repeat. `subscriberId` is who
   * the operator should be when the account has none on record.
   */
  async setUp(account: AccountScope, name: OperatorName = {}, subscriberId?: string): Promise<void> {
    await this.setupHumanRelay.execute(
      SetupHumanRelayCommand.create({
        environmentId: account.environmentId,
        organizationId: account.organizationId,
        userId: account.userId,
        operator: true,
        subscriberId,
        firstName: name.firstName,
        lastName: name.lastName,
      })
    );
  }

  /**
   * Runs a claim with the account's untouched agent out of the way. When the claim fails, or the agent
   * could only be removed halfway, the account gets its agent back with the same operator contact, so it
   * is never left without one. A claim that goes through counts the setup it brought for the account.
   */
  async claimOverUntouchedAgent<T extends ClaimedSetup>(
    account: AccountScope,
    name: OperatorName,
    claim: () => Promise<T>
  ): Promise<T> {
    const untouched = await this.findUntouchedAgent(account);
    let removing = false;

    try {
      if (untouched) {
        removing = true;
        await this.remove(account, untouched);
      }

      const claimed = await claim();
      this.countClaimedSetup(account, claimed?.agentIdentifier);

      return claimed;
    } catch (error) {
      if (removing) {
        await this.setUp(account, name, untouched?.operator ?? undefined);
      }

      throw error;
    }
  }

  /**
   * The account's relay agent when nothing was done with it: it's the only relay agent, no channel is
   * connected, nobody is invited, nothing was asked, and the operator saved no email or default channel.
   */
  private async findUntouchedAgent(account: AccountScope): Promise<UntouchedAgent | null> {
    const scope = { _environmentId: account.environmentId, _organizationId: account.organizationId };
    const relays = await this.agentRepository.find({ ...scope, runtime: 'human_relay' }, ['_id', 'identifier'], {
      limit: 2,
    });
    const [agent] = relays;

    // Another relay agent shares the operator's contact, so it can't be taken away from under it.
    if (relays.length !== 1 || agent.identifier !== DEFAULT_HUMAN_RELAY_IDENTIFIER) {
      return null;
    }

    const operator = await this.humanOperator.findForAgent({ ...account, agentId: agent._id });
    const [channels, interactions, otherContacts, operatorSubscriber, operatorContact] = await Promise.all([
      this.agentIntegrationRepository.count({ ...scope, _agentId: agent._id }),
      this.humanInteractionRepository.count({ ...scope, _agentId: agent._id }),
      this.subscriberRepository.count({ ...scope, ...(operator ? { subscriberId: { $ne: operator } } : {}) }),
      operator ? this.subscriberRepository.findOne({ ...scope, subscriberId: operator }, 'email') : null,
      operator ? this.humanContactRepository.findContact(account.environmentId, agent._id, operator) : null,
    ]);

    if (channels > 0 || interactions > 0 || otherContacts > 0) {
      return null;
    }

    if (operatorSubscriber?.email || operatorContact?.defaultVia) {
      return null;
    }

    return { agentId: agent._id, operator };
  }

  /**
   * A setup made without an account was never counted: it belonged to nobody. What works of it counts now, for
   * the account that claimed it, as made in the CLI: its inbox once it has its address, and each channel that
   * is connected. In the background, so counting never slows or fails a claim.
   */
  private countClaimedSetup(account: AccountScope, agentIdentifier: string | undefined): void {
    if (!agentIdentifier) {
      return;
    }

    this.trackClaimedSetup(account, agentIdentifier).catch(() => undefined);
  }

  private async trackClaimedSetup(account: AccountScope, agentIdentifier: string): Promise<void> {
    const agent = await this.agentRepository.findOne(
      { _environmentId: account.environmentId, _organizationId: account.organizationId, identifier: agentIdentifier },
      ['_id', 'identifier', 'name', 'runtime']
    );
    if (agent?.runtime !== 'human_relay') {
      return;
    }

    const owner = { userId: account.userId, organizationId: account.organizationId };
    const channels = await this.deliveryService.listWorkingChannels({
      environmentId: account.environmentId,
      organizationId: account.organizationId,
      agent,
    });

    if (channels.includes(HumanChannelViaEnum.EMAIL)) {
      trackAgentInboxCreated(this.analyticsService, owner, { agentId: agent._id, source: 'cli' });
    }

    for (const channel of channels) {
      trackAgentInboxChannelConnected(this.analyticsService, owner, { agentId: agent._id, channel });
    }
  }

  private async remove(account: AccountScope, { agentId, operator }: UntouchedAgent): Promise<void> {
    const scope = { _environmentId: account.environmentId, _organizationId: account.organizationId };

    await this.humanContactRepository.delete({ ...scope, _agentId: agentId });
    if (operator) {
      await this.subscriberRepository.delete({ ...scope, subscriberId: operator });
    }
    await this.agentRepository.delete({ ...scope, _id: agentId });
  }
}
