import { Injectable } from '@nestjs/common';
import { HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { isAgentProvisionedSubscriber } from '../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import type { InboxRelayAgent, InboxScope } from './human-inbox.service';
import { HumanOperatorService } from './human-operator.service';

/** Someone who can wake the agent's hosts: the operator, or a contact the operator allowed to. */
export type Waker = { id: string; name?: string; isOperator: boolean };

/** Everyone who can wake an agent's hosts right now, by subscriberId. */
export type Wakers = ReadonlyMap<string, Waker>;

/**
 * Who can wake an Agent Inbox agent's hosts: the operator always; a contact only while the operator has their
 * "can wake" switch on; a stranger never, nor anyone whose contact is gone. It is read when it is needed, so a
 * switch turned off counts at once. The wake program's wait asks here, and so does sending new messages out
 * to the chat apps that wake in their makers' clouds.
 */
@Injectable()
export class HumanWakeAccessService {
  constructor(
    private readonly humanOperator: HumanOperatorService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  /** Everyone who can wake the agent's hosts right now: the operator and the contacts allowed to. */
  async whoCanWake(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>): Promise<Wakers> {
    const [operatorId, allowed] = await Promise.all([
      this.humanOperator.findForAgent({ ...scope, agentId: agent._id }),
      this.humanContactRepository.findCanWakeSubscriberIds(scope.environmentId, agent._id),
    ]);

    return this.contactsAmong(scope, operatorId, allowed);
  }

  /** Those of `subscriberIds` who can wake the agent's hosts right now. */
  async whichCanWake(
    scope: InboxScope,
    agent: Pick<InboxRelayAgent, '_id'>,
    subscriberIds: readonly string[]
  ): Promise<Wakers> {
    const asked = [...new Set(subscriberIds)];
    if (asked.length === 0) {
      return new Map();
    }

    const [operatorId, rows] = await Promise.all([
      this.humanOperator.findForAgent({ ...scope, agentId: agent._id }),
      this.humanContactRepository.find(
        { _environmentId: scope.environmentId, _agentId: agent._id, subscriberId: { $in: asked }, canWake: true },
        ['subscriberId']
      ),
    ]);

    return this.contactsAmong(
      scope,
      operatorId && asked.includes(operatorId) ? operatorId : null,
      rows.map((row) => row.subscriberId)
    );
  }

  async canWake(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>, subscriberId: string): Promise<boolean> {
    return (await this.whichCanWake(scope, agent, [subscriberId])).has(subscriberId);
  }

  /**
   * The operator and the allowed contacts that are still contacts: a subscriber the agent made up for someone
   * who wrote unasked is a stranger, whatever their switch says, and one that is gone can't write anymore.
   */
  private async contactsAmong(scope: InboxScope, operatorId: string | null, allowed: string[]): Promise<Wakers> {
    const ids = [...new Set([...(operatorId ? [operatorId] : []), ...allowed])];
    if (ids.length === 0) {
      return new Map();
    }

    const subscribers = await this.subscriberRepository.find(
      { _environmentId: scope.environmentId, _organizationId: scope.organizationId, subscriberId: { $in: ids } },
      'subscriberId firstName lastName data'
    );

    return new Map(
      subscribers
        .filter((subscriber) => !isAgentProvisionedSubscriber(subscriber))
        .map((subscriber): [string, Waker] => {
          const name = [subscriber.firstName, subscriber.lastName].filter(Boolean).join(' ').trim();

          return [
            subscriber.subscriberId,
            {
              id: subscriber.subscriberId,
              ...(name ? { name } : {}),
              isOperator: subscriber.subscriberId === operatorId,
            },
          ];
        })
    );
  }
}
