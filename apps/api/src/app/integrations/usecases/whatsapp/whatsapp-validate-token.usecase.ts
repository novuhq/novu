import { Injectable } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';

import {
  debugAccessToken,
  extractMetaError,
  flattenScopes,
  getPhoneNumberDetails,
  listWabaPhoneNumbers,
  WHATSAPP_BUSINESS_MANAGEMENT_SCOPE,
  WHATSAPP_BUSINESS_MESSAGING_SCOPE,
} from './whatsapp-graph-api.utils';
import { WhatsAppValidateTokenCommand } from './whatsapp-validate-token.command';

export type WhatsAppValidateTokenError = {
  code:
    | 'invalid_token'
    | 'expired_token'
    | 'phone_not_found'
    | 'phone_mismatch'
    | 'waba_not_accessible'
    | 'waba_phone_mismatch'
    | 'missing_messaging_scope'
    | 'unknown';
  message: string;
};

export interface WhatsAppValidateTokenResult {
  valid: boolean;
  hasManagementScope: boolean;
  hasMessagingScope: boolean;
  scopes: string[];
  expiresAt?: number;
  wabaId?: string;
  phoneNumberId?: string;
  displayPhoneNumber?: string;
  verifiedName?: string;
  error?: WhatsAppValidateTokenError;
}

@Injectable()
export class WhatsAppValidateToken {
  constructor(private readonly logger: PinoLogger) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: WhatsAppValidateTokenCommand): Promise<WhatsAppValidateTokenResult> {
    const accessToken = command.accessToken.trim();

    let debug: Awaited<ReturnType<typeof debugAccessToken>>;
    try {
      debug = await debugAccessToken(accessToken);
    } catch (err) {
      this.logger.warn({ err }, 'WhatsApp validate token: debug_token call failed');

      return {
        valid: false,
        hasManagementScope: false,
        hasMessagingScope: false,
        scopes: [],
        error: {
          code: 'unknown',
          message: 'Could not reach Meta to validate the token. Try again in a moment.',
        },
      };
    }

    const debugBody = debug.body.data;

    if (!debugBody || debugBody.is_valid === false) {
      const detail = debugBody?.error?.message ?? 'Meta rejected this access token.';

      return {
        valid: false,
        hasManagementScope: false,
        hasMessagingScope: false,
        scopes: [],
        error: { code: 'invalid_token', message: detail },
      };
    }

    const scopes = flattenScopes(debug.body);
    const hasManagementScope = scopes.includes(WHATSAPP_BUSINESS_MANAGEMENT_SCOPE);
    const hasMessagingScope = scopes.includes(WHATSAPP_BUSINESS_MESSAGING_SCOPE);
    const expiresAt = debugBody.expires_at && debugBody.expires_at > 0 ? debugBody.expires_at : undefined;

    if (!hasMessagingScope) {
      return {
        valid: false,
        hasManagementScope,
        hasMessagingScope,
        scopes,
        expiresAt,
        error: {
          code: 'missing_messaging_scope',
          message: `This token is missing the "${WHATSAPP_BUSINESS_MESSAGING_SCOPE}" permission needed to send WhatsApp messages.`,
        },
      };
    }

    const phoneNumberId = command.phoneNumberIdentification?.trim();
    const wabaId = command.businessAccountId?.trim();

    if (!phoneNumberId && !wabaId) {
      return { valid: true, hasManagementScope, hasMessagingScope, scopes, expiresAt };
    }

    let displayPhoneNumber: string | undefined;
    let verifiedName: string | undefined;

    if (phoneNumberId) {
      const phoneError = await this.lookupPhoneNumber(accessToken, phoneNumberId);
      if (phoneError.error) {
        return {
          valid: false,
          hasManagementScope,
          hasMessagingScope,
          scopes,
          expiresAt,
          phoneNumberId,
          wabaId,
          error: phoneError.error,
        };
      }
      displayPhoneNumber = phoneError.details.display_phone_number;
      verifiedName = phoneError.details.verified_name;
    }

    if (wabaId) {
      const wabaCheck = await this.crossCheckWaba(accessToken, wabaId, phoneNumberId);
      if (wabaCheck.error) {
        return {
          valid: false,
          hasManagementScope,
          hasMessagingScope,
          scopes,
          expiresAt,
          phoneNumberId,
          wabaId,
          displayPhoneNumber,
          verifiedName,
          error: wabaCheck.error,
        };
      }
      displayPhoneNumber = displayPhoneNumber ?? wabaCheck.matchedPhone?.display_phone_number;
      verifiedName = verifiedName ?? wabaCheck.matchedPhone?.verified_name;
    }

    return {
      valid: true,
      hasManagementScope,
      hasMessagingScope,
      scopes,
      expiresAt,
      phoneNumberId,
      wabaId,
      displayPhoneNumber,
      verifiedName,
    };
  }

  private async lookupPhoneNumber(
    accessToken: string,
    phoneNumberId: string
  ): Promise<{
    details: { display_phone_number?: string; verified_name?: string };
    error?: WhatsAppValidateTokenError;
  }> {
    let phone: Awaited<ReturnType<typeof getPhoneNumberDetails>>;
    try {
      phone = await getPhoneNumberDetails(accessToken, phoneNumberId);
    } catch (err) {
      this.logger.warn({ err }, 'WhatsApp validate token: phone number lookup failed');

      return {
        details: {},
        error: {
          code: 'unknown',
          message: 'Could not look up the phone number with Meta. Try again in a moment.',
        },
      };
    }

    const phoneError = extractMetaError(phone.body);
    if (phoneError) {
      const isPermission = phoneError.code === 200 || phoneError.code === 10 || phoneError.code === 190;
      const isNotFound = phone.statusCode === 404 || phoneError.subcode === 33;

      let code: WhatsAppValidateTokenError['code'] = 'unknown';
      if (isPermission) {
        code = 'phone_mismatch';
      } else if (isNotFound) {
        code = 'phone_not_found';
      }

      const message = isPermission
        ? `This token can't read phone number "${phoneNumberId}". Make sure the Phone Number ID belongs to the same WhatsApp Business Account the token was generated for.`
        : phoneError.message;

      return {
        details: {},
        error: { code, message },
      };
    }

    return { details: phone.body as { display_phone_number?: string; verified_name?: string } };
  }

  private async crossCheckWaba(
    accessToken: string,
    wabaId: string,
    phoneNumberId: string | undefined
  ): Promise<{
    matchedPhone?: { display_phone_number?: string; verified_name?: string };
    error?: WhatsAppValidateTokenError;
  }> {
    let response: Awaited<ReturnType<typeof listWabaPhoneNumbers>>;
    try {
      response = await listWabaPhoneNumbers(accessToken, wabaId);
    } catch (err) {
      this.logger.warn({ err, wabaId }, 'WhatsApp validate token: WABA lookup failed');

      return {
        error: {
          code: 'unknown',
          message: 'Could not reach Meta to validate the WhatsApp Business Account ID. Try again in a moment.',
        },
      };
    }

    const wabaError = extractMetaError(response.body);
    if (wabaError || response.statusCode >= 400) {
      const isPermission = wabaError?.code === 200 || wabaError?.code === 10 || wabaError?.code === 190;
      const isNotFound = response.statusCode === 404 || wabaError?.subcode === 33;

      const code: WhatsAppValidateTokenError['code'] = isPermission || isNotFound ? 'waba_not_accessible' : 'unknown';

      let message: string;
      if (isPermission) {
        message = `This token can't access WhatsApp Business Account "${wabaId}". Double-check the WABA ID is the one shown on your API Setup page.`;
      } else if (isNotFound) {
        message = `Meta couldn't find a WhatsApp Business Account with id "${wabaId}". Double-check the value on the API Setup page.`;
      } else {
        message = wabaError?.message ?? `Meta returned HTTP ${response.statusCode}`;
      }

      return {
        error: { code, message },
      };
    }

    if (!phoneNumberId) {
      return {};
    }

    const matchedPhone = response.body.data?.find((entry) => entry.id === phoneNumberId);
    if (!matchedPhone) {
      return {
        error: {
          code: 'waba_phone_mismatch',
          message: `Phone Number ID "${phoneNumberId}" is not part of WhatsApp Business Account "${wabaId}". Make sure both values are from the same row on the API Setup page.`,
        },
      };
    }

    return { matchedPhone };
  }
}
