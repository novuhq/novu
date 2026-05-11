import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  debugAccessToken,
  extractMetaError,
  type MetaErrorSummary,
  sendWhatsAppTemplate,
} from '../../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import { SendWhatsAppTestTemplateCommand } from './send-whatsapp-test-template.command';

const TEMPLATE_NAME = 'hello_world';
const TEMPLATE_LANGUAGE = 'en_US';

const META_DEV_CONSOLE_URL_BASE = 'https://developers.facebook.com/apps';

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
  /**
   * Optional Meta dev-console URL the dashboard can render as a button to
   * shortcut the user to the page where they can take corrective action
   * (e.g. add a verified test recipient when the app is still in dev mode).
   */
  helpUrl?: string;
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
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: SendWhatsAppTestTemplateCommand): Promise<SendWhatsAppTestTemplateResult> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id', 'identifier']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

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

    // Authorization: ensure the integration is actually linked to this agent
    // before sending outbound messages through it. Without this check an
    // `AGENT_WRITE` caller could trigger sends through unrelated WhatsApp
    // integrations in the same tenant.
    const agentIntegrationLink = await this.agentIntegrationRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _agentId: agent._id,
        _integrationId: integration._id,
      },
      ['_id']
    );

    if (!agentIntegrationLink) {
      throw new NotFoundException(
        `Integration "${command.integrationIdentifier}" is not linked to agent "${command.agentIdentifier}".`
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
      const failure = this.classifyMetaError(error, response.statusCode, command.to);

      if (failure.code === 'recipient_not_allowed') {
        failure.helpUrl = await this.resolveDevConsoleUrl(accessToken);
      }

      this.logger.warn(
        { integrationId: integration._id, statusCode: response.statusCode, metaError: error },
        'WhatsApp test template: Meta rejected send'
      );

      return { success: false, error: failure };
    }

    const messageId = response.body.messages?.[0]?.id;

    return { success: true, messageId };
  }

  /**
   * Best-effort lookup of the Meta App ID via `debug_token` so we can build a
   * deep link straight to the WhatsApp dev console. Failures fall back to the
   * generic apps list page rather than blocking the error response.
   */
  private async resolveDevConsoleUrl(accessToken: string): Promise<string> {
    try {
      const debug = await debugAccessToken(accessToken);
      const appId = debug.body.data?.app_id;
      if (appId) {
        return `${META_DEV_CONSOLE_URL_BASE}/${encodeURIComponent(appId)}/whatsapp-business/wa-dev-console/`;
      }
    } catch (err) {
      this.logger.warn({ err }, 'WhatsApp test template: failed to resolve app_id for help URL');
    }

    return `${META_DEV_CONSOLE_URL_BASE}/`;
  }

  private classifyMetaError(
    error: MetaErrorSummary | undefined,
    statusCode: number,
    recipient: string
  ): SendWhatsAppTestTemplateError {
    const message = error?.message ?? `Meta returned HTTP ${statusCode}`;

    if (error?.code === 131030 || error?.subcode === 2494051) {
      return {
        code: 'recipient_not_allowed',
        message: `${recipient} isn't on your test recipient list. In Meta's WhatsApp dev console go to To → Manage phone number list, add the number, then enter the WhatsApp OTP Meta sends before retrying.`,
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
