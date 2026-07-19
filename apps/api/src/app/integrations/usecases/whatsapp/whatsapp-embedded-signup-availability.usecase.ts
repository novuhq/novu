import { Injectable } from '@nestjs/common';
import { FeatureFlagsService, InstrumentUsecase } from '@novu/application-generic';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import type { WhatsAppEmbeddedSignupAvailabilityResponseDto } from '../../dtos/whatsapp-embedded-signup-availability.dto';
import { getNovuWhatsAppPlatformConfig } from './whatsapp-credentials.utils';
import { WhatsAppEmbeddedSignupAvailabilityCommand } from './whatsapp-embedded-signup-availability.command';

/**
 * Reports whether Meta Embedded Signup can be completed on this deployment for
 * this organization, so clients (notably the connect CLI) can route between the
 * embedded-signup flow and the classic dashboard handoff before starting.
 */
@Injectable()
export class WhatsAppEmbeddedSignupAvailability {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @InstrumentUsecase()
  async execute(
    command: WhatsAppEmbeddedSignupAvailabilityCommand
  ): Promise<WhatsAppEmbeddedSignupAvailabilityResponseDto> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
    });

    if (!isEnabled) {
      return { available: false, reason: 'feature_disabled' };
    }

    if (!getNovuWhatsAppPlatformConfig()) {
      return { available: false, reason: 'missing_platform_config' };
    }

    return { available: true };
  }
}
