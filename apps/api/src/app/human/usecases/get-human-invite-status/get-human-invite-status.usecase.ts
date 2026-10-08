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
import { HumanOperatorService } from '../../services/human-operator.service';
import { GetHumanInviteStatusCommand } from './get-human-invite-status.command';

/** What the public invite page renders. Read-only, so link scanners can't change anything. */
@Injectable()
export class GetHumanInviteStatus {
  constructor(
    private readonly inviteTokens: HumanInviteTokenService,
    private readonly deliveryService: HumanDeliveryService,
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly operatorService: HumanOperatorService
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
      ['name']
    );

    if (!agent) {
      return { valid: false, reason: 'invalid' };
    }

    const [channels, subscriber, inviterName] = await Promise.all([
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
      this.findInviterName(payload),
    ]);
    const displayName = fullName(subscriber);

    return {
      valid: true,
      agentName: agent.name,
      ...(inviterName ? { inviterName } : {}),
      inviteeName: displayName || payload.subscriberId,
      expiresAt: invite.expiresAt,
      channels: channels.map(({ via, connected, isDefault }) => ({ via, connected, isDefault })),
    };
  }

  /** The account owner's name, when they have one: they are who the agent asks for, so the invite is theirs. */
  private async findInviterName(payload: ActiveHumanInvite['payload']): Promise<string | undefined> {
    const operatorId = await this.operatorService.findForAgent({
      environmentId: payload.env,
      organizationId: payload.org,
      agentId: payload.agentId,
    });
    if (!operatorId) {
      return undefined;
    }

    const operator = await this.subscriberRepository.findOne(
      { _environmentId: payload.env, subscriberId: operatorId },
      'firstName lastName'
    );

    return fullName(operator) || undefined;
  }
}

function fullName(person: { firstName?: string; lastName?: string } | null | undefined): string {
  return [person?.firstName, person?.lastName].filter(Boolean).join(' ');
}
