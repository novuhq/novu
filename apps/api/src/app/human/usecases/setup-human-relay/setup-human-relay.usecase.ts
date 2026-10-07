import { ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  AgentEntity,
  AgentRepository,
  HumanContactRepository,
  isDuplicateKeyError,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import { AgentSubscriberAccessEnum } from '@novu/shared';
import type { SetupHumanRelayResponseDto } from '../../dtos/setup-human-relay.dto';
import { HumanOperatorService } from '../../services/human-operator.service';
import { SetupHumanRelayCommand } from './setup-human-relay.command';

export const DEFAULT_HUMAN_RELAY_IDENTIFIER = 'human-relay';

type ContactDetails = Partial<Pick<SubscriberEntity, 'email' | 'firstName' | 'lastName'>>;

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
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly humanOperator: HumanOperatorService
  ) {}

  @InstrumentUsecase()
  async execute(command: SetupHumanRelayCommand): Promise<SetupHumanRelayResponseDto> {
    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;

    const agent = await this.ensureRelayAgent(command, identifier);
    const subscriberId = await this.resolveSubscriberId(command, agent);
    await this.ensureSubscriber(command, subscriberId);

    if (command.defaultVia) {
      await this.humanContactRepository.setDefaultVia({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        agentId: agent._id,
        subscriberId,
        via: command.defaultVia,
        setBy: 'inviter',
      });
    }

    return {
      agentId: agent._id,
      agentIdentifier: agent.identifier,
      subscriberId,
    };
  }

  /** Whoever the caller names, except for the operator: there the relay agent's recorded operator wins. */
  private async resolveSubscriberId(command: SetupHumanRelayCommand, agent: AgentEntity): Promise<string> {
    if (!command.operator) {
      return command.subscriberId as string;
    }

    return this.humanOperator.resolve(
      { environmentId: command.environmentId, organizationId: command.organizationId, agentId: agent._id },
      command.subscriberId
    );
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

  private async ensureSubscriber(command: SetupHumanRelayCommand, subscriberId: string): Promise<void> {
    const details: ContactDetails = {
      email: command.email?.trim().toLowerCase() || undefined,
      firstName: command.firstName?.trim() || undefined,
      lastName: command.lastName?.trim() || undefined,
    };

    if (await this.updateExistingSubscriber(command, subscriberId, details)) {
      return;
    }

    try {
      await this.subscriberRepository.create({
        subscriberId,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        ...(details.email ? { email: details.email } : {}),
        ...(details.firstName ? { firstName: details.firstName } : {}),
        ...(details.lastName ? { lastName: details.lastName } : {}),
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      // A setup running at the same moment created the subscriber first. This request's email and
      // name still have to land on it.
      await this.updateExistingSubscriber(command, subscriberId, details);
    }
  }

  /** Saves the details on the subscriber when there is one, and says whether there was. */
  private async updateExistingSubscriber(
    command: SetupHumanRelayCommand,
    subscriberId: string,
    { email, firstName, lastName }: ContactDetails
  ): Promise<boolean> {
    const existing = await this.subscriberRepository.findOne({
      subscriberId,
      _environmentId: command.environmentId,
    });

    if (!existing) {
      return false;
    }

    // Email identity powers the email channel (delivery target + inbound
    // reply resolution live on Subscriber.email — no ChannelEndpoint).
    // Names are only ever set or replaced, never cleared: an invite that
    // omits `--name` must not wipe a name captured earlier.
    const updates: ContactDetails = {};
    if (email && existing.email !== email) updates.email = email;
    if (firstName && existing.firstName !== firstName) updates.firstName = firstName;
    if (lastName && existing.lastName !== lastName) updates.lastName = lastName;

    if (Object.keys(updates).length > 0) {
      await this.subscriberRepository.update(
        { subscriberId, _environmentId: command.environmentId },
        { $set: updates }
      );
    }

    return true;
  }
}
