import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  extractMetaError,
  type MetaErrorSummary,
  sendWhatsAppTemplate,
} from '../../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import { SendWhatsAppTestTemplateCommand } from './send-whatsapp-test-template.command';

const TEMPLATE_NAME = 'hello_world';
const TEMPLATE_LANGUAGE = 'en_US';

export type SendWhatsAppTestTemplateError = {
  code:
    | 'missing_credentials'
    | 'recipient_not_allowed'
    | 'token_expired'
    | 'template_unavailable'
    | 'invalid_recipient'
    | 'rate_limited'
    | 'meta_rejected'
    | 'unknown';
  message: string;
};

export interface SendWhatsAppTestTemplateResult {
  success: boolean;
  messageId?: string;
  error?: SendWhatsAppTestTemplateError;
}

function normalizeRecipient(value: string): string {
  const trimmed = value.trim();
  // Meta accepts E.164 without the + sign.
  return trimmed.startsWith('+') ? trimmed.slice(1) : trimmed;
}

@Injectable()
export class SendWhatsAppTestTemplate {
  constructor(
    private readonly integrationRepository: IntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SendWhatsAppTestTemplateCommand): Promise<SendWhatsAppTestTemplateResult> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
      identifier: command.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(`Integration with identifier "${command.integrationIdentifier}" was not found.`);
    }

    if (integration.providerId !== ChatProviderIdEnum.WhatsAppBusiness) {
      throw new NotFoundException(
        `Integration "${command.integrationIdentifier}" is not a WhatsApp Business integration.`
      );
    }

    const credentials = decryptCredentials(integration.credentials ?? {});
    const accessToken = typeof credentials.apiToken === 'string' ? credentials.apiToken.trim() : '';
    const phoneNumberId =
      typeof credentials.phoneNumberIdentification === 'string' ? credentials.phoneNumberIdentification.trim() : '';

    if (!accessToken || !phoneNumberId) {
      return {
        success: false,
        error: {
          code: 'missing_credentials',
          message: 'Save the WhatsApp Access Token and Phone Number ID before sending a test message.',
        },
      };
    }

    let response: Awaited<ReturnType<typeof sendWhatsAppTemplate>>;
    try {
      response = await sendWhatsAppTemplate({
        accessToken,
        phoneNumberId,
        to: normalizeRecipient(command.to),
        templateName: TEMPLATE_NAME,
        languageCode: TEMPLATE_LANGUAGE,
      });
    } catch (err) {
      this.logger.warn({ err, integrationId: integration._id }, 'WhatsApp test template send failed');

      return {
        success: false,
        error: {
          code: 'unknown',
          message: 'Could not reach Meta to send the test message. Try again in a moment.',
        },
      };
    }

    const error = extractMetaError(response.body);
    if (error || response.statusCode >= 400) {
      const failure = this.classifyMetaError(error, response.statusCode);

      this.logger.warn(
        { integrationId: integration._id, statusCode: response.statusCode, metaError: error },
        'WhatsApp test template: Meta rejected send'
      );

      return { success: false, error: failure };
    }

    const messageId = response.body.messages?.[0]?.id;

    return { success: true, messageId };
  }

  private classifyMetaError(error: MetaErrorSummary | undefined, statusCode: number): SendWhatsAppTestTemplateError {
    const message = error?.message ?? `Meta returned HTTP ${statusCode}`;

    if (error?.code === 131030 || error?.subcode === 2494051) {
      return {
        code: 'recipient_not_allowed',
        message:
          "Meta refused to deliver to this phone number — it's not in your test recipient list. Add it under WhatsApp > API Setup, then retry.",
      };
    }

    if (error?.code === 190 || error?.code === 463) {
      return {
        code: 'token_expired',
        message:
          'This access token has expired. Generate a fresh token (or a System User token for production) and save it in Novu.',
      };
    }

    if (error?.code === 132001 || error?.code === 132000 || error?.code === 132005) {
      return {
        code: 'template_unavailable',
        message: `The "${TEMPLATE_NAME}" template isn't approved for this WhatsApp Business Account. Check the templates section in Meta.`,
      };
    }

    if (error?.code === 131009 || error?.code === 100) {
      return {
        code: 'invalid_recipient',
        message: 'Meta rejected the recipient phone number — double-check the number includes the country code.',
      };
    }

    if (statusCode === 429 || error?.code === 130429) {
      return {
        code: 'rate_limited',
        message: 'Meta is rate-limiting test sends. Wait a few seconds and try again.',
      };
    }

    return { code: 'meta_rejected', message };
  }
}
