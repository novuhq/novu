import { randomBytes } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentRepository, HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { buildRelayOwnerCardName } from './relay-owner-name';

/** The subscriberId `human setup` made up for the operator before the API kept track: `human_` and 12 hex characters. */
const CLI_OPERATOR_ID_PATTERN = /^human_[0-9a-f]{12}$/;

type OperatorScope = { environmentId: string; organizationId: string; agentId: string };

/** A relay agent named by its identifier instead of its internal id. */
type RelayScope = Omit<OperatorScope, 'agentId'> & { agentIdentifier: string };

/** The operator as an agent's card shows them: "Ada L.", and their first name for "Ada’s agent". */
export type OperatorCardName = { operatorName: string; operatorFirstName: string };

/**
 * Which contact is the account owner. The CLI and the Human dashboard both ask here, so an operator who
 * uses both is one contact, not two. An account has one owner: a second relay agent in the same
 * environment gets the operator of the first.
 */
@Injectable()
export class HumanOperatorService {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository
  ) {}

  /**
   * The operator's subscriberId, or `null` when there is none yet. Setups from before the operator was
   * recorded have none stored; there the oldest contact made by `human setup` is the operator.
   */
  async find(scope: RelayScope): Promise<string | null> {
    const agentId = await this.findRelayAgentId(scope);

    return agentId ? this.findForAgent({ ...scope, agentId }) : null;
  }

  /**
   * The relay agent and its operator, for a call that changes the operator's own contact. A 404 before
   * `human setup` has made the agent, or while nobody is set up as its operator.
   */
  async require(scope: RelayScope): Promise<{ agentId: string; subscriberId: string }> {
    const agentId = await this.findRelayAgentId(scope);
    if (!agentId) {
      throw new NotFoundException({
        code: 'agent_not_found',
        message: 'There is no agent yet. Run `npx @agentinbox/cli setup` first.',
      });
    }

    const subscriberId = await this.findForAgent({ ...scope, agentId });
    if (!subscriberId) {
      throw new NotFoundException({
        code: 'operator_not_found',
        message: 'You aren’t one of your agent’s contacts yet. Run `npx @agentinbox/cli setup` first.',
      });
    }

    return { agentId, subscriberId };
  }

  private async findRelayAgentId(scope: RelayScope): Promise<string | null> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: scope.agentIdentifier,
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
      },
      ['_id', 'runtime']
    );

    return agent?.runtime === 'human_relay' ? agent._id : null;
  }

  /**
   * Makes sure the relay agent has an operator and returns their subscriberId. A stored operator always
   * wins, so a caller that suggests another id (a CLI on a second computer) gets the stored one back.
   */
  async resolve(scope: OperatorScope, suggestedSubscriberId?: string): Promise<string> {
    const known = await this.findForAgent(scope);

    return this.humanContactRepository.claimOperator({
      ...scope,
      subscriberId: known ?? suggestedSubscriberId ?? `human_${randomBytes(6).toString('hex')}`,
    });
  }

  /** The operator of one relay agent, by the agent's internal id. */
  async findForAgent(scope: OperatorScope): Promise<string | null> {
    const stored = await this.humanContactRepository.findOperator(scope.environmentId, scope.agentId);
    if (stored) {
      return stored.subscriberId;
    }

    const recordedElsewhere = await this.humanContactRepository.findOperatorInEnvironment(scope.environmentId);
    if (recordedElsewhere) {
      return recordedElsewhere.subscriberId;
    }

    const [madeByCli] = await this.subscriberRepository.find(
      {
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
        subscriberId: { $regex: CLI_OPERATOR_ID_PATTERN },
      },
      'subscriberId',
      { sort: { _id: 1 }, limit: 1 }
    );

    return madeByCli?.subscriberId ?? null;
  }

  /**
   * The operator as the agent's card names them, "Ada L.", with their whole first name for "Ada’s agent". The
   * public card and the operator's own card on the Configure page both read it here, so they never disagree.
   * Nothing without an operator or a first name.
   */
  async cardNameFor(scope: OperatorScope): Promise<OperatorCardName | undefined> {
    const operatorId = await this.findForAgent(scope);
    if (!operatorId) {
      return undefined;
    }

    const operator = await this.subscriberRepository.findOne(
      { _environmentId: scope.environmentId, subscriberId: operatorId },
      'firstName lastName'
    );
    const operatorName = buildRelayOwnerCardName(operator?.firstName, operator?.lastName);

    return operatorName ? { operatorName, operatorFirstName: operator?.firstName?.trim() ?? '' } : undefined;
  }
}
