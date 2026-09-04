import { ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { AgentEntity, AgentRepository, SubscriberEntity, SubscriberRepository } from '@novu/dal';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import type { SetupHumanRelayResponseDto } from '../../dtos/setup-human-relay.dto';
import { SetupHumanRelayCommand } from './setup-human-relay.command';

export const DEFAULT_HUMAN_RELAY_IDENTIFIER = 'human-relay';

/**
 * Idempotent bootstrap behind `human setup`: ensures the environment has its
 * hidden `human_relay` system agent (the delivery/webhook anchor for all human
 * interactions) and that the human's subscriber row exists. Channel linking
 * itself reuses the standard agent-integration + channel-endpoint flows.
 */
@Injectable()
export class SetupHumanRelay {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: SetupHumanRelayCommand): Promise<SetupHumanRelayResponseDto> {
    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;

    const agent = await this.ensureRelayAgent(command, identifier);
    await this.ensureSubscriber(command);

    return {
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      subscriberId: command.subscriberId,
    };
  }

  private async ensureRelayAgent(command: SetupHumanRelayCommand, identifier: string): Promise<AgentEntity> {
    const existing = await this.agentRepository.findOne(
      {
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (existing) {
      if (existing.runtime !== 'human_relay') {
        throw new ConflictException(
          `Agent identifier "${identifier}" is already used by a regular agent. Pass a different relay identifier.`
        );
      }

      return existing;
    }

    return this.agentRepository.create({
      name: 'Human',
      identifier,
      active: true,
      runtime: 'human_relay',
      // Unknown senders auto-provision so the setup QR link flow can bind the
      // human's chat before any subscriber mapping exists.
      behavior: { subscriberAccess: AgentSubscriberAccessEnum.OPEN },
      creationSource: 'cli',
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      ...(command.userId ? { createdBy: command.userId } : {}),
    });
  }

  private async ensureSubscriber(command: SetupHumanRelayCommand): Promise<void> {
    const email = command.email?.trim().toLowerCase();
    const firstName = command.firstName?.trim() || undefined;
    const lastName = command.lastName?.trim() || undefined;

    const existing = await this.subscriberRepository.findOne({
      subscriberId: command.subscriberId,
      _environmentId: command.environmentId,
    });

    if (existing) {
      // Email identity powers the email channel (delivery target + inbound
      // reply resolution live on Subscriber.email — no ChannelEndpoint).
      // Names are only ever set or replaced, never cleared: an invite that
      // omits `--name` must not wipe a name captured earlier.
      const updates: Partial<Pick<SubscriberEntity, 'email' | 'firstName' | 'lastName'>> = {};
      if (email && existing.email !== email) updates.email = email;
      if (firstName && existing.firstName !== firstName) updates.firstName = firstName;
      if (lastName && existing.lastName !== lastName) updates.lastName = lastName;

      if (Object.keys(updates).length > 0) {
        await this.subscriberRepository.update(
          { subscriberId: command.subscriberId, _environmentId: command.environmentId },
          { $set: updates }
        );
      }

      return;
    }

    await this.subscriberRepository.create({
      subscriberId: command.subscriberId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      ...(email ? { email } : {}),
      ...(firstName ? { firstName } : {}),
      ...(lastName ? { lastName } : {}),
    });
  }
}
