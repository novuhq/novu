import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentRepository, SubscriberRepository } from '@novu/dal';
import type { HumanContactChannelStatus } from '@novu/shared';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { GetContactCommand } from './get-contact.command';

export type GetContactResult = {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  data?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  channels: HumanContactChannelStatus[];
};

/**
 * Single-contact lookup for the CLI (polling after invite, and richer
 * `human contacts` output). Channel status comes from HumanDeliveryService —
 * never from public subscriber APIs, and never from `Subscriber.email` alone.
 */
@Injectable()
export class GetContact {
  constructor(
    private readonly subscriberRepository: SubscriberRepository,
    private readonly agentRepository: AgentRepository,
    private readonly deliveryService: HumanDeliveryService
  ) {}

  @InstrumentUsecase()
  async execute(command: GetContactCommand): Promise<GetContactResult> {
    const subscriber = await this.subscriberRepository.findOne({
      subscriberId: command.subscriberId,
      _environmentId: command.environmentId,
    });

    if (!subscriber) {
      throw new NotFoundException(`Contact "${command.subscriberId}" not found.`);
    }

    const agentIdentifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;
    const agent = await this.agentRepository.findOne(
      {
        identifier: agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    const channels: HumanContactChannelStatus[] = agent
      ? await this.deliveryService.describeContactChannels({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentId: agent._id,
          subscriberId: command.subscriberId,
        })
      : [];

    return {
      id: subscriber.subscriberId,
      ...(subscriber.firstName ? { firstName: subscriber.firstName } : {}),
      ...(subscriber.lastName ? { lastName: subscriber.lastName } : {}),
      ...(subscriber.email ? { email: subscriber.email } : {}),
      ...(subscriber.phone ? { phone: subscriber.phone } : {}),
      ...(subscriber.data ? { data: subscriber.data } : {}),
      createdAt: subscriber.createdAt,
      updatedAt: subscriber.updatedAt,
      channels,
    };
  }
}
