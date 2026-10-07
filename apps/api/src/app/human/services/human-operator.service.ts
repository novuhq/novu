import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { AgentRepository, HumanContactRepository, SubscriberRepository } from '@novu/dal';

/** The subscriberId `human setup` made up for the operator before the API kept track: `human_` and 12 hex characters. */
const CLI_OPERATOR_ID_PATTERN = /^human_[0-9a-f]{12}$/;

type OperatorScope = { environmentId: string; organizationId: string; agentId: string };

/**
 * Which contact is the account owner. The CLI and the Human dashboard both ask here, so an operator who
 * uses both is one contact, not two.
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
  async find(scope: Omit<OperatorScope, 'agentId'> & { agentIdentifier: string }): Promise<string | null> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: scope.agentIdentifier,
        _environmentId: scope.environmentId,
        _organizationId: scope.organizationId,
      },
      ['_id', 'runtime']
    );

    if (!agent || agent.runtime !== 'human_relay') {
      return null;
    }

    return this.findForAgent({ ...scope, agentId: agent._id });
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

  private async findForAgent(scope: OperatorScope): Promise<string | null> {
    const stored = await this.humanContactRepository.findOperator(scope.environmentId, scope.agentId);
    if (stored) {
      return stored.subscriberId;
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
}
