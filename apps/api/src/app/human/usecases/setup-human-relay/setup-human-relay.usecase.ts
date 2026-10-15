import { ConflictException, Injectable } from '@nestjs/common';
import { InstrumentUsecase, isAgentSharedInboxEnabled, PinoLogger } from '@novu/application-generic';
import {
  AgentEntity,
  AgentRepository,
  HumanContactRepository,
  isDuplicateKeyError,
  SubscriberEntity,
  SubscriberRepository,
} from '@novu/dal';
import {
  AGENT_PROVISION_DATA_KEYS,
  AgentSubscriberAccessEnum,
  EmailProviderIdEnum,
  HumanChannelViaEnum,
} from '@novu/shared';
import { isAgentProvisionedSubscriber } from '../../../agents/conversation-runtime/conversation/agent-subscriber-resolver.service';
import { NovuEmailProvisioningService } from '../../../agents/email/novu-email/find-or-create-novu-email/find-or-create-novu-email.service';
import { HUMAN_RELAY_DEFAULT_NAME } from '../../../agents/human-relay/human-relay-identity';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../../../agents/shared/util/email-normalization';
import type { SetupHumanRelayResponseDto } from '../../dtos/setup-human-relay.dto';
import { HumanAgentIdentityService } from '../../services/human-agent-identity.service';
import { HumanOperatorService } from '../../services/human-operator.service';
import { SetupHumanRelayCommand } from './setup-human-relay.command';

export const DEFAULT_HUMAN_RELAY_IDENTIFIER = 'human-relay';

type ContactDetails = Partial<Pick<SubscriberEntity, 'firstName' | 'lastName'>>;

/**
 * Idempotent bootstrap behind `human setup`: ensures the environment has its
 * hidden `human_relay` system agent (the delivery/webhook anchor for all human
 * interactions) and that the human's subscriber row exists. Channel linking
 * itself reuses the standard agent-integration + channel-endpoint flows.
 *
 * When the caller is the relay's owner (`operator: true`), the relay records
 * their subscriberId. Their name stays on that subscriber and is shown next to
 * the agent's own name, which is never overwritten.
 */
@Injectable()
export class SetupHumanRelay {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly subscriberRepository: SubscriberRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly humanOperator: HumanOperatorService,
    private readonly humanAgentIdentity: HumanAgentIdentityService,
    private readonly findOrCreateNovuEmail: NovuEmailProvisioningService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SetupHumanRelayCommand): Promise<SetupHumanRelayResponseDto> {
    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;

    const agent = await this.ensureRelayAgent(command, identifier);
    const subscriberId = await this.resolveSubscriberId(command, agent);
    await this.ensureSubscriber(command, subscriberId);
    await this.ensureAgentEmailInbox(command, agent);
    await this.rememberDeclaredEmail(command, agent._id, subscriberId);

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
      agentName: agent.name,
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

      // Running setup again with another name or description is how they are changed.
      return this.humanAgentIdentity.apply(existing, {
        name: command.agentName,
        description: command.agentDescription,
      });
    }

    const description = command.agentDescription?.trim();

    return this.agentRepository.create({
      name: command.agentName?.trim() || HUMAN_RELAY_DEFAULT_NAME,
      ...(description ? { description } : {}),
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
    // Subscriber.email is written when verification is promoted (`VerifyAddress`).
    const details: ContactDetails = {
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
        ...(details.firstName ? { firstName: details.firstName } : {}),
        ...(details.lastName ? { lastName: details.lastName } : {}),
      });
    } catch (err) {
      if (!isDuplicateKeyError(err)) {
        throw err;
      }

      // A setup running at the same moment created the subscriber first. This request's name still has to land on it.
      await this.updateExistingSubscriber(command, subscriberId, details);
    }
  }

  /** Saves the details on the subscriber when there is one, and says whether there was. */
  private async updateExistingSubscriber(
    command: SetupHumanRelayCommand,
    subscriberId: string,
    { firstName, lastName }: ContactDetails
  ): Promise<boolean> {
    const existing = await this.subscriberRepository.findOne({
      subscriberId,
      _environmentId: command.environmentId,
    });

    if (!existing) {
      return false;
    }

    // Names are only ever set or replaced, never cleared: an invite that
    // omits `--name` must not wipe a name captured earlier.
    const updates: ContactDetails = {};
    if (firstName && existing.firstName !== firstName) updates.firstName = firstName;
    if (lastName && existing.lastName !== lastName) updates.lastName = lastName;

    // A row an agent made up for an unknown sender counts as a stranger. Setup means the operator
    // added this person, so the row stops being one.
    const becomesContact = isAgentProvisionedSubscriber(existing);

    if (Object.keys(updates).length > 0 || becomesContact) {
      await this.subscriberRepository.update(
        { subscriberId, _environmentId: command.environmentId },
        {
          ...(Object.keys(updates).length > 0 ? { $set: updates } : {}),
          ...(becomesContact ? { $unset: { [`data.${AGENT_PROVISION_DATA_KEYS.source}`]: '' } } : {}),
        }
      );
    }

    return true;
  }

  /**
   * Every setup gets an agent email inbox. Self-hosted has no shared address to
   * hand out, so it is skipped. A failure here must not fail `human setup`.
   */
  private async ensureAgentEmailInbox(command: SetupHumanRelayCommand, agent: AgentEntity): Promise<void> {
    if (!isAgentSharedInboxEnabled()) {
      return;
    }

    try {
      await this.findOrCreateNovuEmail.execute(
        agent._id,
        command.environmentId,
        command.organizationId,
        EmailProviderIdEnum.AgentEmailInbox
      );
    } catch (err) {
      this.logger.warn({ err, agentId: agent._id }, 'Failed to provision the agent email inbox');
    }
  }

  /** Stored unverified. Delivery still requires the verified slot. */
  private async rememberDeclaredEmail(
    command: SetupHumanRelayCommand,
    agentId: string,
    subscriberId: string
  ): Promise<void> {
    const raw = command.email?.trim();
    if (!raw) {
      return;
    }

    const address = normalizeEmailForLookup(raw);
    if (!isValidEmailForLookup(address)) {
      return;
    }

    await this.humanContactRepository.setDeclaredAddress({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId,
      subscriberId,
      via: HumanChannelViaEnum.EMAIL,
      address,
    });
  }
}
