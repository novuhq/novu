import { Injectable } from '@nestjs/common';
import { HumanContactRepository, SubscriberRepository } from '@novu/dal';
import { isAgentProvisionedSubscriber } from '../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import type { InboxRelayAgent, InboxScope } from './human-inbox.service';
import { HumanOperatorService } from './human-operator.service';

/**
 * Someone the agent listens to: the operator, or a contact the operator turned "Listen to" on for. `fullAccess` is
 * only ever set on a contact the operator also gave full access: their messages start the hosts with everything the
 * operator's get, and the hosts ask them, not the operator.
 */
export type ListenedPerson = { id: string; name?: string; isOperator: boolean; fullAccess?: true };

/** A contact with "Listen to" on, and whether they have full access too. */
type ListenedContact = { subscriberId: string; fullAccess: boolean };

/** Everyone the agent listens to right now, by subscriberId. */
export type ListenedTo = ReadonlyMap<string, ListenedPerson>;

/**
 * Whom an Agent Inbox agent listens to, so that their messages start its hosts: the operator always; a contact only
 * while the operator has their "Listen to" switch on; a stranger never, nor anyone whose contact is gone. It is read
 * when it is needed, so a switch turned off counts at once. The listener's wait asks here, and so does sending new
 * messages out to the chat apps that run in their makers' clouds.
 */
@Injectable()
export class HumanListenAccessService {
  constructor(
    private readonly humanOperator: HumanOperatorService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  /** Everyone the agent listens to right now: the operator, and the contacts with "Listen to" on. */
  async whoIsListenedTo(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>): Promise<ListenedTo> {
    const [operatorId, allowed] = await Promise.all([
      this.humanOperator.findForAgent({ ...scope, agentId: agent._id }),
      this.humanContactRepository.findListenedTo(scope.environmentId, agent._id),
    ]);

    return this.contactsAmong(scope, operatorId, allowed);
  }

  /** Those of `subscriberIds` the agent listens to right now. */
  async whichAreListenedTo(
    scope: InboxScope,
    agent: Pick<InboxRelayAgent, '_id'>,
    subscriberIds: readonly string[]
  ): Promise<ListenedTo> {
    const asked = [...new Set(subscriberIds)];
    if (asked.length === 0) {
      return new Map();
    }

    const [operatorId, rows] = await Promise.all([
      this.humanOperator.findForAgent({ ...scope, agentId: agent._id }),
      this.humanContactRepository.find(
        { _environmentId: scope.environmentId, _agentId: agent._id, subscriberId: { $in: asked }, listenTo: true },
        ['subscriberId', 'fullAccess']
      ),
    ]);

    return this.contactsAmong(
      scope,
      operatorId && asked.includes(operatorId) ? operatorId : null,
      rows.map((row) => ({ subscriberId: row.subscriberId, fullAccess: row.fullAccess === true }))
    );
  }

  async listenTo(scope: InboxScope, agent: Pick<InboxRelayAgent, '_id'>, subscriberId: string): Promise<boolean> {
    return (await this.whichAreListenedTo(scope, agent, [subscriberId])).has(subscriberId);
  }

  /** Whether the agent listens to them, and whether they have full access: both always for the operator. */
  async switchesOf(
    scope: InboxScope,
    agent: Pick<InboxRelayAgent, '_id'>,
    subscriberId: string
  ): Promise<{ listenTo: boolean; fullAccess: boolean }> {
    const person = (await this.whichAreListenedTo(scope, agent, [subscriberId])).get(subscriberId);

    return { listenTo: person !== undefined, fullAccess: person?.isOperator === true || person?.fullAccess === true };
  }

  /**
   * The operator and the allowed contacts that are still contacts: a subscriber the agent made up for someone
   * who wrote unasked is a stranger, whatever their switch says, and one that is gone can't write anymore.
   */
  private async contactsAmong(
    scope: InboxScope,
    operatorId: string | null,
    allowed: ListenedContact[]
  ): Promise<ListenedTo> {
    const ids = [...new Set([...(operatorId ? [operatorId] : []), ...allowed.map((contact) => contact.subscriberId)])];
    if (ids.length === 0) {
      return new Map();
    }

    const withFullAccess = new Set(
      allowed.filter((contact) => contact.fullAccess).map((contact) => contact.subscriberId)
    );
    const subscribers = await this.subscriberRepository.find(
      { _environmentId: scope.environmentId, _organizationId: scope.organizationId, subscriberId: { $in: ids } },
      'subscriberId firstName lastName data'
    );

    return new Map(
      subscribers
        .filter((subscriber) => !isAgentProvisionedSubscriber(subscriber))
        .map((subscriber): [string, ListenedPerson] => {
          const name = [subscriber.firstName, subscriber.lastName].filter(Boolean).join(' ').trim();
          const isOperator = subscriber.subscriberId === operatorId;

          return [
            subscriber.subscriberId,
            {
              id: subscriber.subscriberId,
              ...(name ? { name } : {}),
              isOperator,
              // The operator always has everything; the switch is for contacts only.
              ...(!isOperator && withFullAccess.has(subscriber.subscriberId) ? { fullAccess: true as const } : {}),
            },
          ];
        })
    );
  }
}
