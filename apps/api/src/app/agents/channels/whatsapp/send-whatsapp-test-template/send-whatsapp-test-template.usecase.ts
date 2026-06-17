import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository, SubscriberRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  countTemplateRequiredBodyParameters,
  createWhatsAppConnectionTestTemplate,
  debugAccessToken,
  extractMetaError,
  listWhatsAppMessageTemplates,
  type MetaErrorSummary,
  NOVU_CONNECTION_TEST_TEMPLATE_LANGUAGE,
  NOVU_CONNECTION_TEST_TEMPLATE_NAME,
  sendWhatsAppTemplate,
  type WhatsAppMessageTemplate,
} from '../../../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import { normalizePhoneForMeta } from '../../../shared/util/phone-normalization';
import { SendWhatsAppTestTemplateCommand } from './send-whatsapp-test-template.command';

const MANUAL_CREDENTIALS_TEST_TEMPLATE = {
  templateName: 'hello_world',
  languageCode: 'en_US',
} as const;

type ResolvedTestTemplate = {
  templateName: string;
  languageCode: string;
};

type ManagedTemplateResolution =
  | { status: 'ready'; template: ResolvedTestTemplate }
  | { status: 'pending'; message: string }
  | { status: 'error'; error: SendWhatsAppTestTemplateError };

const META_DEV_CONSOLE_URL_BASE = 'https://developers.facebook.com/apps';

export type SendWhatsAppTestTemplateError = {
  code:
    | 'missing_credentials'
    | 'recipient_not_allowed'
    | 'token_expired'
    | 'template_unavailable'
    | 'template_pending_approval'
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

const TEMPLATE_PENDING_MESSAGE =
  'Novu set up a test template on your WhatsApp Business account and Meta is still approving it (usually 1–2 minutes). Your connection is already active — try the test again shortly.';

@Injectable()
export class SendWhatsAppTestTemplate {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly subscriberRepository: SubscriberRepository,
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

    const subscriber = await this.subscriberRepository.findBySubscriberId(command.environmentId, command.subscriberId);

    if (!subscriber) {
      throw new NotFoundException(`Subscriber with id "${command.subscriberId}" was not found.`);
    }

    const subscriberPhone = typeof subscriber.phone === 'string' ? subscriber.phone.trim() : '';

    if (!subscriberPhone) {
      throw new UnprocessableEntityException(
        `Subscriber "${command.subscriberId}" does not have a phone number. Save a phone on the subscriber before sending a test message.`
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

    const isNovuManaged = credentials.isNovuManaged === true;
    let testTemplate: ResolvedTestTemplate = MANUAL_CREDENTIALS_TEST_TEMPLATE;

    if (isNovuManaged) {
      const wabaId = typeof credentials.businessAccountId === 'string' ? credentials.businessAccountId.trim() : '';
      const resolution = await this.resolveManagedTestTemplate({
        accessToken,
        wabaId,
        integrationId: integration._id,
      });

      if (resolution.status === 'pending') {
        return { success: false, error: { code: 'template_pending_approval', message: resolution.message } };
      }

      if (resolution.status === 'error') {
        return { success: false, error: resolution.error };
      }

      testTemplate = resolution.template;
    }

    let response: Awaited<ReturnType<typeof sendWhatsAppTemplate>>;
    try {
      response = await sendWhatsAppTemplate({
        accessToken,
        phoneNumberId,
        to: normalizePhoneForMeta(subscriberPhone),
        templateName: testTemplate.templateName,
        languageCode: testTemplate.languageCode,
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
      const failure = this.classifyMetaError(error, response.statusCode, subscriberPhone, testTemplate.templateName);

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
   * Resolves a sendable template for Novu-managed (Embedded Signup) integrations
   * without requiring the customer to create anything in WhatsApp Manager.
   *
   * Strategy:
   *  1. List the WABA's templates and prefer Novu's provisioned
   *     `novu_connection_test` template when it is APPROVED.
   *  2. Otherwise fall back to any APPROVED template that needs no body
   *     variables (so we can send it without per-recipient data).
   *  3. If nothing is approved yet, make sure our template exists (creating it
   *     if a previous best-effort attempt during signup failed) and report a
   *     calm "pending approval" state rather than a hard error — the connection
   *     itself is already verified via the inbound webhook.
   */
  private async resolveManagedTestTemplate(args: {
    accessToken: string;
    wabaId: string;
    integrationId: string;
  }): Promise<ManagedTemplateResolution> {
    const { accessToken, wabaId, integrationId } = args;

    if (!wabaId) {
      return {
        status: 'error',
        error: {
          code: 'missing_credentials',
          message:
            'This WhatsApp integration is missing its Business Account ID. Reconnect via WhatsApp Embedded Signup to finish setup.',
        },
      };
    }

    let templates: WhatsAppMessageTemplate[] = [];
    try {
      const listResult = await listWhatsAppMessageTemplates({ accessToken, wabaId });
      const listError = extractMetaError(listResult.body);

      if (listError || listResult.statusCode >= 400) {
        this.logger.warn(
          { integrationId, wabaId, statusCode: listResult.statusCode, metaError: listError },
          'WhatsApp test template: failed to list WABA templates'
        );

        return {
          status: 'error',
          error: {
            code: 'meta_rejected',
            message: listError?.message ?? 'Could not read your WhatsApp message templates from Meta. Try again.',
          },
        };
      }

      templates = listResult.body.data ?? [];
    } catch (err) {
      this.logger.warn({ err, integrationId, wabaId }, 'WhatsApp test template: list templates call failed');

      return {
        status: 'error',
        error: {
          code: 'unknown',
          message: 'Could not reach Meta to read your WhatsApp message templates. Try again in a moment.',
        },
      };
    }

    const isApproved = (template: WhatsAppMessageTemplate) => template.status?.toUpperCase() === 'APPROVED';

    const novuTemplate = templates.find((template) => template.name === NOVU_CONNECTION_TEST_TEMPLATE_NAME);

    if (novuTemplate && isApproved(novuTemplate)) {
      return {
        status: 'ready',
        template: {
          templateName: NOVU_CONNECTION_TEST_TEMPLATE_NAME,
          languageCode: novuTemplate.language ?? NOVU_CONNECTION_TEST_TEMPLATE_LANGUAGE,
        },
      };
    }

    const approvedZeroVariableTemplate = templates.find(
      (template) =>
        isApproved(template) &&
        template.name !== 'hello_world' &&
        Boolean(template.name) &&
        countTemplateRequiredBodyParameters(template) === 0
    );

    if (approvedZeroVariableTemplate?.name) {
      return {
        status: 'ready',
        template: {
          templateName: approvedZeroVariableTemplate.name,
          languageCode: approvedZeroVariableTemplate.language ?? NOVU_CONNECTION_TEST_TEMPLATE_LANGUAGE,
        },
      };
    }

    // Nothing usable is approved yet. If our template was never created (a
    // best-effort signup attempt may have failed), create it now so it can be
    // approved and used on the next attempt.
    if (!novuTemplate) {
      try {
        const createResult = await createWhatsAppConnectionTestTemplate({ accessToken, wabaId });
        const createError = extractMetaError(createResult.body);

        if (createError || createResult.statusCode >= 400) {
          this.logger.warn(
            { integrationId, wabaId, statusCode: createResult.statusCode, metaError: createError },
            'WhatsApp test template: failed to create connection test template'
          );
        }
      } catch (err) {
        this.logger.warn(
          { err, integrationId, wabaId },
          'WhatsApp test template: create connection test template call failed'
        );
      }
    }

    return { status: 'pending', message: TEMPLATE_PENDING_MESSAGE };
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
    recipient: string,
    templateName: string
  ): SendWhatsAppTestTemplateError {
    const message = error?.message ?? `Meta returned HTTP ${statusCode}`;

    if (error?.code === 131058) {
      return {
        code: 'template_unavailable',
        message: `The "${templateName}" template can only be sent from a Meta public test number. Connect via WhatsApp Embedded Signup to send from your own business number.`,
      };
    }

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
        code: 'template_pending_approval',
        message: TEMPLATE_PENDING_MESSAGE,
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
