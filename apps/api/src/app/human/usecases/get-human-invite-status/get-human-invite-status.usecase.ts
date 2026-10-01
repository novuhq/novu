import { Injectable } from '@nestjs/common';
import { AgentRepository, SubscriberRepository } from '@novu/dal';
import type { HumanInviteStatusResult } from '../../dtos/human-invite.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import {
  type ActiveHumanInvite,
  HumanInviteTokenService,
  InactiveHumanInviteError,
  toHttpError,
} from '../../services/human-invite-token.service';
import { buildRelayOwnerName, resolveRelaySender } from '../../services/relay-owner-name';
import { GetHumanInviteStatusCommand } from './get-human-invite-status.command';

/** What the public invite page renders. Read-only, so link scanners can't change anything. */
@Injectable()
export class GetHumanInviteStatus {
  constructor(
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly deliveryService: HumanDeliveryService,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  async execute(command: GetHumanInviteStatusCommand): Promise<HumanInviteStatusResult> {
    let invite: ActiveHumanInvite;
    try {
      invite = await this.inviteTokens.peek(command.token);
    } catch (err) {
      if (err instanceof InactiveHumanInviteError) {
        return { valid: false, reason: err.reason };
      }

      throw toHttpError(err);
    }

    const { payload } = invite;
    const agent = await this.agentRepository.findOne(
      { _id: payload.agentId, _environmentId: payload.env, _organizationId: payload.org },
      ['name', 'operatorSubscriberId']
    );

    if (!agent) {
      return { valid: false, reason: 'invalid' };
    }

    const [channels, subscriber, sender] = await Promise.all([
      this.deliveryService.describeInviteChannels({
        environmentId: payload.env,
        organizationId: payload.org,
        agentId: payload.agentId,
        subscriberId: payload.subscriberId,
      }),
      this.subscriberRepository.findOne(
        { _environmentId: payload.env, subscriberId: payload.subscriberId },
        'firstName lastName'
      ),
      resolveRelaySender({ agent, environmentId: payload.env, subscriberRepository: this.subscriberRepository }),
    ]);
    const displayName = buildRelayOwnerName(subscriber?.firstName, subscriber?.lastName);

    return {
      valid: true,
      ...sender,
      inviteeName: displayName ?? payload.subscriberId,
      expiresAt: invite.expiresAt,
      channels: channels.map(({ via, connected, isDefault, status, address }) => ({
        via,
        connected,
        isDefault,
        status,
        ...(address ? { address } : {}),
      })),
    };
  }
}
