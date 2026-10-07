import { Injectable } from '@nestjs/common';
import {
  AgentIntegrationRepository,
  AgentRepository,
  HumanContactRepository,
  HumanInteractionRepository,
  SubscriberRepository,
} from '@novu/dal';
import { SetupHumanRelayCommand } from '../usecases/setup-human-relay/setup-human-relay.command';
import {
  DEFAULT_HUMAN_RELAY_IDENTIFIER,
  SetupHumanRelay,
} from '../usecases/setup-human-relay/setup-human-relay.usecase';
import { HumanOperatorService } from './human-operator.service';

type AccountScope = { environmentId: string; organizationId: string; userId: string };
type OperatorName = { firstName?: string; lastName?: string };

/**
 * The relay agent every Human account gets at sign-up (the Human dashboard asks for it right after the
 * account), and what happens to it when the operator brings a setup made without an account: an agent nobody has used yet steps aside for the one being claimed,
 * an agent in use stays and the claim is refused as before.
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
    private readonly setupHumanRelay: SetupHumanRelay
  ) {}

  /** Gives the account its relay agent and the operator's contact. Safe to repeat. */
  async setUp(account: AccountScope, name: OperatorName = {}): Promise<void> {
    await this.setupHumanRelay.execute(
      SetupHumanRelayCommand.create({
        environmentId: account.environmentId,
        organizationId: account.organizationId,
        userId: account.userId,
        operator: true,
        firstName: name.firstName,
        lastName: name.lastName,
      })
    );
  }

  /**
   * Runs a claim with the account's untouched agent out of the way. When the claim fails, the account
   * gets its agent back, so it is never left without one.
   */
  async claimOverUntouchedAgent<T>(account: AccountScope, name: OperatorName, claim: () => Promise<T>): Promise<T> {
    const removed = await this.removeUntouchedAgent(account);

    try {
      return await claim();
    } catch (error) {
      if (removed) {
        await this.setUp(account, name);
      }

      throw error;
    }
  }

  /**
   * Removes the account's relay agent when nothing was done with it: no channel connected, nobody
   * invited, nothing asked. Says whether it removed one.
   */
  private async removeUntouchedAgent(account: AccountScope): Promise<boolean> {
    const scope = { _environmentId: account.environmentId, _organizationId: account.organizationId };
    const agent = await this.agentRepository.findOne({ ...scope, identifier: DEFAULT_HUMAN_RELAY_IDENTIFIER }, [
      '_id',
      'runtime',
    ]);

    if (!agent || agent.runtime !== 'human_relay') {
      return false;
    }

    const operator = await this.humanOperator.findForAgent({ ...account, agentId: agent._id });
    const [channels, interactions, otherContacts] = await Promise.all([
      this.agentIntegrationRepository.count({ ...scope, _agentId: agent._id }),
      this.humanInteractionRepository.count({ ...scope, _agentId: agent._id }),
      this.subscriberRepository.count({ ...scope, ...(operator ? { subscriberId: { $ne: operator } } : {}) }),
    ]);

    if (channels > 0 || interactions > 0 || otherContacts > 0) {
      return false;
    }

    await this.humanContactRepository.delete({ ...scope, _agentId: agent._id });
    if (operator) {
      await this.subscriberRepository.delete({ ...scope, subscriberId: operator });
    }
    await this.agentRepository.delete({ ...scope, _id: agent._id });

    return true;
  }
}
