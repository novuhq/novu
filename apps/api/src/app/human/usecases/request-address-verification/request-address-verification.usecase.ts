import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  AgentIntegrationRepository,
  AgentRepository,
  type HumanContactPendingAddress,
  HumanContactRepository,
  IntegrationRepository,
} from '@novu/dal';
import { HumanChannelViaEnum } from '@novu/shared';
import { resolveAgentOutboundEmail } from '../../../agents/email/resolve-agent-outbound-email';
import { isValidEmailForLookup, normalizeEmailForLookup } from '../../../agents/shared/util/email-normalization';
import { HumanVerificationEmailSender } from '../../email/human-verification-email.sender';
import { HumanVerificationRateLimitService } from '../../services/human-verification-rate-limit.service';
import {
  HumanVerificationTokenService,
  toVerificationHttpError,
} from '../../services/human-verification-token.service';
import { maskEmail } from '../../services/mask-email';
import { SetupHumanRelayCommand } from '../setup-human-relay/setup-human-relay.command';
import { SetupHumanRelay } from '../setup-human-relay/setup-human-relay.usecase';
import { RequestAddressVerificationCommand } from './request-address-verification.command';

export type RequestAddressVerificationResult = {
  address: string;
  /** Identifies this request; the contact's verified channel reports the same value once this link is used. */
  requestedAt: string;
  expiresAt: string;
  retryAfterSeconds: number;
  /** A different address is already verified and stays deliverable until this one is confirmed. */
  replacesVerifiedAddress: boolean;
};

/**
 * Starts (or restarts) double opt-in for an address-based channel. The CLI
 * path provisions the relay first; the invite page passes the agent id already
 * on the token. Nothing is written until the agent can actually send the mail.
 */
@Injectable()
export class RequestAddressVerification {
  constructor(
    private readonly setupHumanRelay: SetupHumanRelay,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly rateLimit: HumanVerificationRateLimitService,
    private readonly verificationTokens: HumanVerificationTokenService,
    private readonly emailSender: HumanVerificationEmailSender
  ) {}

  @InstrumentUsecase()
  async execute(command: RequestAddressVerificationCommand): Promise<RequestAddressVerificationResult> {
    const address = requireEmailAddress(command.via, command.address);
    const agentId = command.agentId ?? (await this.provisionRelay(command)).agentId;

    return this.start({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId,
      subscriberId: command.subscriberId,
      via: command.via,
      address,
    });
  }

  private async provisionRelay(command: RequestAddressVerificationCommand) {
    return this.setupHumanRelay.execute(
      SetupHumanRelayCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId ?? '',
        subscriberId: command.subscriberId,
        agentIdentifier: command.agentIdentifier,
        firstName: command.firstName,
        lastName: command.lastName,
        defaultVia: command.setDefaultVia ? HumanChannelViaEnum.EMAIL : undefined,
      })
    );
  }

  private async start(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    via: HumanChannelViaEnum;
    address: string;
  }): Promise<RequestAddressVerificationResult> {
    const agent = await this.agentRepository.findOne(
      {
        _id: params.agentId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      ['_id', 'name']
    );
    if (!agent) {
      throw new NotFoundException('Relay agent not found.');
    }

    let outbound: Awaited<ReturnType<typeof resolveAgentOutboundEmail>>;
    try {
      outbound = await resolveAgentOutboundEmail({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentId: agent._id,
        agentName: agent.name,
        integrationRepository: this.integrationRepository,
        agentIntegrationRepository: this.agentIntegrationRepository,
      });
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw new NotFoundException('No email channel is linked to the relay agent. Run `human setup email` first.');
      }

      throw err;
    }

    const verified = await this.humanContactRepository.findVerifiedAddress(
      params.environmentId,
      params.agentId,
      params.subscriberId,
      params.via
    );
    const previousPending = await this.humanContactRepository.findPendingAddress(
      params.environmentId,
      params.agentId,
      params.subscriberId,
      params.via
    );

    const { retryAfterSeconds, reservation } = await this.rateLimit.assertAndRecord({
      environmentId: params.environmentId,
      agentId: params.agentId,
      subscriberId: params.subscriberId,
      via: params.via,
    });

    let written: HumanContactPendingAddress | undefined;
    try {
      written = await this.humanContactRepository.upsertPendingAddress({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentId: params.agentId,
        subscriberId: params.subscriberId,
        via: params.via,
        address: params.address,
      });

      let issued: { token: string; expiresAt: string };
      try {
        issued = await this.verificationTokens.issue({
          env: params.environmentId,
          org: params.organizationId,
          agentId: params.agentId,
          subscriberId: params.subscriberId,
          via: params.via,
          address: params.address,
        });
      } catch (err) {
        throw toVerificationHttpError(err);
      }

      await this.emailSender.send({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentId: params.agentId,
        subscriberId: params.subscriberId,
        address: params.address,
        token: issued.token,
        expiresAt: issued.expiresAt,
        outbound,
      });

      return {
        address: maskEmail(params.address),
        requestedAt: written.requestedAt,
        expiresAt: issued.expiresAt,
        retryAfterSeconds,
        replacesVerifiedAddress: Boolean(verified && verified.address !== params.address),
      };
    } catch (err) {
      await this.compensateFailedSend({ ...params, reservation }, written, previousPending);

      throw err;
    }
  }

  /**
   * A failed send must leave the previous pending link usable and must not
   * consume the cooldown or daily allowance. Restore while the cooldown is
   * still held, then release it.
   */
  private async compensateFailedSend(
    params: {
      environmentId: string;
      agentId: string;
      subscriberId: string;
      via: HumanChannelViaEnum;
      reservation: string;
    },
    written: HumanContactPendingAddress | undefined,
    previousPending: HumanContactPendingAddress | null
  ): Promise<void> {
    if (written) {
      await this.humanContactRepository
        .restorePendingAddress({
          environmentId: params.environmentId,
          agentId: params.agentId,
          subscriberId: params.subscriberId,
          via: params.via,
          replaced: written,
          pending: previousPending,
        })
        .catch(() => undefined);
    }

    await this.rateLimit.release(params).catch(() => undefined);
  }
}

function requireEmailAddress(via: HumanChannelViaEnum, raw: string): string {
  if (via !== HumanChannelViaEnum.EMAIL) {
    throw new BadRequestException({
      code: 'via_unsupported',
      message: `Address verification is not supported for ${via} yet.`,
    });
  }

  const address = normalizeEmailForLookup(raw);
  if (!isValidEmailForLookup(address)) {
    throw new BadRequestException({
      code: 'address_invalid',
      message: 'Enter a valid email address.',
    });
  }

  return address;
}
