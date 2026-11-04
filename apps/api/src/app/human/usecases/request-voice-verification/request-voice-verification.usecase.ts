import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { FeatureFlagsService, InstrumentUsecase } from '@novu/application-generic';
import { type HumanContactPendingAddress, HumanContactRepository } from '@novu/dal';
import { HumanChannelViaEnum, VOICE_VERIFICATION_CALL_MINUTES } from '@novu/shared';
import { PlaceVerificationCall, verificationLineFor } from '../../../agents/channels/voice/place-verification-call';
import { isUnconfirmedVoiceDial } from '../../../agents/channels/voice/voice-call-failure';
import { readVoiceVerificationConfig } from '../../../agents/channels/voice/voice-config';
import { assertVoiceEnabledForConnect } from '../../../agents/shared/assert-voice-enabled';
import { KeylessVoiceGateService } from '../../../keyless/keyless-voice-gate.service';
import { HumanVerificationRateLimitService } from '../../services/human-verification-rate-limit.service';
import {
  type HumanVoiceMinuteCredits,
  HumanVoiceMinuteQuotaService,
} from '../../services/human-voice-minute-quota.service';
import {
  HumanVoiceVerificationCodeService,
  type StoredVoiceCode,
} from '../../services/human-voice-verification-code.service';
import { maskPhone, normalizeE164 } from '../../services/normalize-phone';
import { SetupHumanRelayCommand } from '../setup-human-relay/setup-human-relay.command';
import { SetupHumanRelay } from '../setup-human-relay/setup-human-relay.usecase';
import { RequestVoiceVerificationCommand } from './request-voice-verification.command';

export type RequestVoiceVerificationResult = {
  address: string;
  /** Identifies this request; the contact's voice channel reports it as `verifiedRequestedAt` once the code is used. */
  requestedAt: string;
  expiresAt: string;
  retryAfterSeconds: number;
  /** A different number is already verified and stays deliverable until this one is confirmed. */
  replacesVerifiedAddress: boolean;
};

/**
 * Starts (or restarts) phone verification. The number is pending until the
 * person types the code the call reads. A failed dial puts the previous
 * pending slot back and does not spend the cooldown.
 */
@Injectable()
export class RequestVoiceVerification {
  constructor(
    private readonly setupHumanRelay: SetupHumanRelay,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly keylessVoiceGate: KeylessVoiceGateService,
    private readonly humanContactRepository: HumanContactRepository,
    private readonly rateLimit: HumanVerificationRateLimitService,
    private readonly codes: HumanVoiceVerificationCodeService,
    private readonly placeVerificationCall: PlaceVerificationCall,
    private readonly voiceMinuteQuota: HumanVoiceMinuteQuotaService
  ) {}

  @InstrumentUsecase()
  async execute(command: RequestVoiceVerificationCommand): Promise<RequestVoiceVerificationResult> {
    await assertVoiceEnabledForConnect(this.featureFlagsService, command.organizationId, command.environmentId);
    await this.keylessVoiceGate.assertAllowed({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
    });
    if (!readVoiceVerificationConfig()) {
      throw new BadGatewayException({
        code: 'voice_not_configured',
        message:
          'Phone verification is not configured on this deployment. Set the shared Twilio number and the verification agent.',
      });
    }

    const address = normalizeE164(command.address);
    if (!address) {
      throw new BadRequestException({
        code: 'address_invalid',
        message: 'Enter a phone number in international format, like +14155550123.',
      });
    }

    const agentId = command.agentId ?? (await this.provisionRelay(command)).agentId;

    return this.start({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId,
      subscriberId: command.subscriberId,
      address,
    });
  }

  private async provisionRelay(command: RequestVoiceVerificationCommand) {
    return this.setupHumanRelay.execute(
      SetupHumanRelayCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        userId: command.userId ?? '',
        subscriberId: command.subscriberId,
        agentIdentifier: command.agentIdentifier,
        firstName: command.firstName,
        lastName: command.lastName,
      })
    );
  }

  private async start(params: {
    environmentId: string;
    organizationId: string;
    agentId: string;
    subscriberId: string;
    address: string;
  }): Promise<RequestVoiceVerificationResult> {
    const [verified, previousPending] = await Promise.all([
      this.humanContactRepository.findVerifiedAddress(
        params.environmentId,
        params.agentId,
        params.subscriberId,
        HumanChannelViaEnum.VOICE
      ),
      this.humanContactRepository.findPendingAddress(
        params.environmentId,
        params.agentId,
        params.subscriberId,
        HumanChannelViaEnum.VOICE
      ),
    ]);

    const { retryAfterSeconds, reservation } = await this.rateLimit.assertAndRecord({
      environmentId: params.environmentId,
      agentId: params.agentId,
      subscriberId: params.subscriberId,
      via: HumanChannelViaEnum.VOICE,
    });

    let written: HumanContactPendingAddress | undefined;
    let issued = false;
    let previousCode: StoredVoiceCode | null = null;
    let credits: HumanVoiceMinuteCredits | undefined;
    const codeKey = {
      environmentId: params.environmentId,
      agentId: params.agentId,
      subscriberId: params.subscriberId,
    };

    try {
      credits = await this.voiceMinuteQuota.reserveMinutes(params.organizationId, VOICE_VERIFICATION_CALL_MINUTES);
      written = await this.humanContactRepository.upsertPendingAddress({
        environmentId: params.environmentId,
        organizationId: params.organizationId,
        agentId: params.agentId,
        subscriberId: params.subscriberId,
        via: HumanChannelViaEnum.VOICE,
        address: params.address,
      });

      const code = await this.codes.issue(codeKey, {
        address: params.address,
        requestedAt: written.requestedAt,
      });
      issued = true;
      previousCode = code.previous;

      await this.placeVerificationCall.execute({
        toNumber: params.address,
        verificationLine: verificationLineFor(code.code),
      });

      return {
        address: maskPhone(params.address),
        requestedAt: written.requestedAt,
        expiresAt: code.expiresAt,
        retryAfterSeconds,
        replacesVerifiedAddress: Boolean(verified && verified.address !== params.address),
      };
    } catch (err) {
      if (!isUnconfirmedVoiceDial(err)) {
        if (issued) {
          await this.restoreOrClearCode(codeKey, previousCode);
        }
        await this.compensateFailedSend({ ...params, reservation }, written, previousPending);
      }

      throw err;
    } finally {
      await credits?.release();
    }
  }

  private async restoreOrClearCode(
    key: { environmentId: string; agentId: string; subscriberId: string },
    previousCode: StoredVoiceCode | null
  ): Promise<void> {
    if (previousCode) {
      await this.codes.restore(key, previousCode).catch(() => undefined);

      return;
    }

    await this.codes.clear(key).catch(() => undefined);
  }

  /**
   * A failed dial must leave the previous pending code usable and must not
   * consume the cooldown or daily allowance.
   */
  private async compensateFailedSend(
    params: {
      environmentId: string;
      agentId: string;
      subscriberId: string;
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
          via: HumanChannelViaEnum.VOICE,
          replaced: written,
          pending: previousPending,
        })
        .catch(() => undefined);
    }

    await this.rateLimit.release({ ...params, via: HumanChannelViaEnum.VOICE }).catch(() => undefined);
  }
}
