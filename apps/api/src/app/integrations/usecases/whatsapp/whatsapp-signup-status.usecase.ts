import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, type ICredentials } from '@novu/shared';
import type { WhatsAppSignupStatusResponseDto } from '../../dtos/whatsapp-signup-status.dto';
import { WhatsAppSignupStatusCommand } from './whatsapp-signup-status.command';

/**
 * Credentials required for sending: access token, phone number ID, and WABA ID.
 * The verify `token` is auto-generated at integration creation, and the app
 * secret is resolved from platform env for Novu-managed integrations, so
 * neither counts toward "signup complete". Mirrors the dashboard's
 * `hasWhatsAppUserCredentials` for the managed case.
 */
function hasWhatsAppSendCredentials(credentials: ICredentials): boolean {
  const requiredKeys = ['apiToken', 'phoneNumberIdentification', 'businessAccountId'] as const;

  return requiredKeys.every((key) => {
    const value = credentials[key];

    return typeof value === 'string' && value.trim().length > 0;
  });
}

/**
 * Secret-free WhatsApp signup progress for polling clients (the connect CLI).
 * API-key callers never receive decrypted credentials from the integrations
 * list, so this exposes only a boolean plus the public business phone number.
 */
@Injectable()
export class WhatsAppSignupStatus {
  constructor(private readonly integrationRepository: IntegrationRepository) {}

  @InstrumentUsecase()
  async execute(command: WhatsAppSignupStatusCommand): Promise<WhatsAppSignupStatusResponseDto> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.integrationIdentifier,
      providerId: ChatProviderIdEnum.WhatsAppBusiness,
    });

    if (!integration) {
      throw new NotFoundException(
        `WhatsApp integration with identifier "${command.integrationIdentifier}" was not found.`
      );
    }

    const credentials = integration.credentials ? decryptCredentials(integration.credentials) : undefined;

    if (!credentials || !hasWhatsAppSendCredentials(credentials)) {
      return { credentialsSaved: false };
    }

    const displayPhoneNumber = typeof credentials.from === 'string' ? credentials.from.trim() : '';

    return {
      credentialsSaved: true,
      ...(displayPhoneNumber ? { displayPhoneNumber } : {}),
    };
  }
}
