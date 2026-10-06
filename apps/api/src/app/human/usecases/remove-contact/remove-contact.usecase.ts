import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, HumanContactRepository, HumanInteractionRepository, SubscriberRepository } from '@novu/dal';
import { HumanInteractionStatusEnum } from '@novu/shared';
import { HumanInteractionSettlementService } from '../../../agents/human-relay/human-interaction-settlement.service';
import { RemoveSubscriberCommand } from '../../../subscribers-v2/usecases/remove-subscriber/remove-subscriber.command';
import { RemoveSubscriber } from '../../../subscribers-v2/usecases/remove-subscriber/remove-subscriber.usecase';
import type { RemoveContactResponseDto } from '../../dtos/list-contacts.dto';
import { HumanInviteTokenService } from '../../services/human-invite-token.service';
import { RemoveContactCommand } from './remove-contact.command';

const PENDING_BATCH_SIZE = 100;

/**
 * Removes a contact for good: retires their invite links, cancels the open interactions addressed
 * to them, forgets their default channel and deletes the subscriber behind them (with its chat
 * connections, messages, preferences and topic subscriptions), so agents can no longer reach them.
 */
@Injectable()
export class RemoveContact {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentRepository: AgentRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly settlement: HumanInteractionSettlementService,
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly removeSubscriber: RemoveSubscriber
  ) {}

  @InstrumentUsecase()
  async execute(command: RemoveContactCommand): Promise<RemoveContactResponseDto> {
    const subscriber = await this.subscriberRepository.findOne(
      { subscriberId: command.subscriberId, _environmentId: command.environmentId },
      '_id'
    );

    if (!subscriber) {
      throw new NotFoundException(`Contact "${command.subscriberId}" was not found.`);
    }

    const relayAgents = await this.agentRepository.find(
      { _environmentId: command.environmentId, _organizationId: command.organizationId, runtime: 'human_relay' },
      ['_id']
    );

    // Links first, so the person can't connect again while the rest is being taken away.
    for (const agent of relayAgents) {
      await this.inviteTokens.revokeAll({
        env: command.environmentId,
        agentId: agent._id,
        subscriberId: command.subscriberId,
      });
    }

    const canceledInteractions = await this.cancelOpenInteractions(command);

    await this.humanContactRepository.delete({
      _environmentId: command.environmentId,
      subscriberId: command.subscriberId,
    });
    await this.removeSubscriber.execute(
      RemoveSubscriberCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
      })
    );

    return { id: command.subscriberId, canceledInteractions };
  }

  /**
   * Cancels through the settlement service so delivered cards lose their buttons and waiting agents
   * resume. An interaction sent to several people is canceled as a whole.
   */
  private async cancelOpenInteractions(command: RemoveContactCommand): Promise<number> {
    let canceled = 0;
    let lastId: string | undefined;

    while (true) {
      const pending = await this.humanInteractionRepository.find(
        {
          _environmentId: command.environmentId,
          subscriberIds: command.subscriberId,
          status: HumanInteractionStatusEnum.PENDING,
          ...(lastId ? { _id: { $gt: lastId } } : {}),
        },
        '*',
        { sort: { _id: 1 }, limit: PENDING_BATCH_SIZE }
      );

      for (const interaction of pending) {
        if (await this.settlement.settle(interaction, HumanInteractionStatusEnum.CANCELED)) {
          canceled += 1;
        }
      }

      if (pending.length < PENDING_BATCH_SIZE) {
        return canceled;
      }

      lastId = pending[pending.length - 1]._id;
    }
  }
}
