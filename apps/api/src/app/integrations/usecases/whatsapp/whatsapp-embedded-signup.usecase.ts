import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, FeatureFlagsService, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum, FeatureFlagsKeysEnum, type ICredentials } from '@novu/shared';
import { ConfigureWhatsAppWebhookCommand } from '../../../agents/channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.command';
import { ConfigureWhatsAppWebhook } from '../../../agents/channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import type { WhatsAppEmbeddedSignupResponseDto } from '../../dtos/whatsapp-embedded-signup.dto';
import { UpdateIntegrationCommand } from '../update-integration/update-integration.command';
import { UpdateIntegration } from '../update-integration/update-integration.usecase';
import { WhatsAppEmbeddedSignupCommand } from './whatsapp-embedded-signup.command';
import {
  exchangeEmbeddedSignupCodeForToken,
  extractMetaError,
  generateWhatsAppRegistrationPin,
  getPhoneNumberDetails,
  listWabaPhoneNumbers,
  type PhoneNumberDetailsResponse,
  registerWhatsAppPhoneNumber,
} from './whatsapp-graph-api.utils';

function getNovuWhatsAppPlatformConfig(): { appId: string; appSecret: string } | undefined {
  const appId = process.env.NOVU_WHATSAPP_APP_ID?.trim();
  const appSecret = process.env.NOVU_WHATSAPP_APP_SECRET?.trim();

  if (!appId || !appSecret) {
    return undefined;
  }

  return { appId, appSecret };
}

@Injectable()
export class WhatsAppEmbeddedSignup {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly updateIntegration: UpdateIntegration,
    private readonly configureWhatsAppWebhook: ConfigureWhatsAppWebhook,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: WhatsAppEmbeddedSignupCommand): Promise<WhatsAppEmbeddedSignupResponseDto> {
    const isEnabled = await this.featureFlagsService.getFlag({
      key: FeatureFlagsKeysEnum.IS_WHATSAPP_EMBEDDED_SIGNUP_ENABLED,
      defaultValue: false,
      environment: { _id: command.environmentId },
      organization: { _id: command.organizationId },
    });

    if (!isEnabled) {
      throw new ForbiddenException({
        statusCode: 403,
        message: 'WhatsApp Embedded Signup is not enabled for this organization.',
        error: 'whatsapp_embedded_signup_disabled',
      });
    }

    const platformConfig = getNovuWhatsAppPlatformConfig();
    if (!platformConfig) {
      return {
        success: false,
        error: {
          code: 'missing_platform_config',
          message: 'WhatsApp Tech Provider credentials are not configured on this deployment.',
        },
      };
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

    let accessToken: string;
    try {
      const exchange = await exchangeEmbeddedSignupCodeForToken({
        appId: platformConfig.appId,
        appSecret: platformConfig.appSecret,
        code: command.code,
      });
      const exchangeError = extractMetaError(exchange.body);
      accessToken = typeof exchange.body.access_token === 'string' ? exchange.body.access_token.trim() : '';

      if (exchangeError || exchange.statusCode >= 400 || !accessToken) {
        this.logger.warn(
          {
            integrationId: integration._id,
            statusCode: exchange.statusCode,
            metaError: exchangeError,
          },
          'WhatsApp embedded signup: token exchange failed'
        );

        return {
          success: false,
          error: {
            code: 'token_exchange_failed',
            message: exchangeError?.message ?? 'Meta rejected the authorization code. Try connecting again.',
          },
        };
      }
    } catch (err) {
      this.logger.warn({ err, integrationId: integration._id }, 'WhatsApp embedded signup: token exchange call failed');

      return {
        success: false,
        error: {
          code: 'token_exchange_failed',
          message: 'Could not reach Meta to exchange the authorization code. Try again.',
        },
      };
    }

    const phoneNumberId = command.phoneNumberId.trim();
    const wabaId = command.wabaId.trim();
    const existingCredentials = integration.credentials ? decryptCredentials(integration.credentials) : undefined;

    let businessDisplayPhone: string | undefined;
    try {
      const phoneDetails = await getPhoneNumberDetails(accessToken, phoneNumberId);
      const phoneDetailsError = extractMetaError(phoneDetails.body);

      if (phoneDetailsError || phoneDetails.statusCode >= 400) {
        return {
          success: false,
          error: {
            code: 'meta_validation_failed',
            message:
              phoneDetailsError?.message ??
              `Meta could not verify phone number "${phoneNumberId}". Try connecting again.`,
          },
        };
      }

      const details = phoneDetails.body as PhoneNumberDetailsResponse;
      businessDisplayPhone = details.display_phone_number?.trim() || undefined;
    } catch (err) {
      this.logger.warn(
        { err, integrationId: integration._id, phoneNumberId },
        'WhatsApp embedded signup: phone number lookup failed'
      );

      return {
        success: false,
        error: {
          code: 'meta_validation_failed',
          message: 'Could not verify the WhatsApp phone number with Meta. Try again.',
        },
      };
    }

    try {
      const wabaPhones = await listWabaPhoneNumbers(accessToken, wabaId);
      const wabaError = extractMetaError(wabaPhones.body);

      if (wabaError || wabaPhones.statusCode >= 400) {
        return {
          success: false,
          error: {
            code: 'meta_validation_failed',
            message:
              wabaError?.message ??
              `Meta could not verify WhatsApp Business Account "${wabaId}". Try connecting again.`,
          },
        };
      }

      if (!Array.isArray(wabaPhones.body.data)) {
        return {
          success: false,
          error: {
            code: 'meta_validation_failed',
            message: `Meta did not return phone numbers for WhatsApp Business Account "${wabaId}". Try connecting again.`,
          },
        };
      }

      const matchedPhone = wabaPhones.body.data.find((entry) => entry.id === phoneNumberId);
      if (!matchedPhone) {
        return {
          success: false,
          error: {
            code: 'meta_validation_failed',
            message: `Phone Number ID "${phoneNumberId}" is not part of WhatsApp Business Account "${wabaId}". Try connecting again.`,
          },
        };
      }

      if (!businessDisplayPhone) {
        businessDisplayPhone = matchedPhone.display_phone_number?.trim() || undefined;
      }
    } catch (err) {
      this.logger.warn(
        { err, integrationId: integration._id, wabaId, phoneNumberId },
        'WhatsApp embedded signup: WABA phone lookup failed'
      );

      return {
        success: false,
        error: {
          code: 'meta_validation_failed',
          message: 'Could not verify the WhatsApp Business Account with Meta. Try again.',
        },
      };
    }

    const nextCredentials: ICredentials = {
      ...(existingCredentials ?? {}),
      apiToken: accessToken,
      phoneNumberIdentification: phoneNumberId,
      businessAccountId: wabaId,
      isNovuManaged: true,
    };
    delete nextCredentials.secretKey;

    if (businessDisplayPhone) {
      nextCredentials.from = businessDisplayPhone;
    } else {
      delete nextCredentials.from;
    }

    await this.updateIntegration.execute(
      UpdateIntegrationCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        userEnvironmentId: command.environmentId,
        integrationId: integration._id,
        credentials: nextCredentials,
        check: false,
      })
    );

    let phoneRegistrationWarning: string | undefined;
    try {
      const pin = generateWhatsAppRegistrationPin();
      const registration = await registerWhatsAppPhoneNumber({
        accessToken,
        phoneNumberId,
        pin,
      });
      const registrationError = extractMetaError(registration.body);

      if (registrationError || registration.statusCode >= 400 || registration.body.success === false) {
        phoneRegistrationWarning =
          registrationError?.message ??
          'Phone number registration with Meta did not succeed. You may need to register the number manually before sending messages.';

        this.logger.warn(
          {
            integrationId: integration._id,
            phoneNumberId,
            statusCode: registration.statusCode,
            metaError: registrationError,
          },
          'WhatsApp embedded signup: phone registration failed (best-effort)'
        );
      }
    } catch (err) {
      phoneRegistrationWarning =
        'Could not register the phone number with Meta automatically. You may need to register it manually before sending messages.';

      this.logger.warn(
        { err, integrationId: integration._id, phoneNumberId: command.phoneNumberId },
        'WhatsApp embedded signup: phone registration call failed (best-effort)'
      );
    }

    const webhookResult = await this.configureWhatsAppWebhook.execute(
      ConfigureWhatsAppWebhookCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentIdentifier: command.agentIdentifier,
        integrationIdentifier: command.integrationIdentifier,
      })
    );

    if (!webhookResult.success) {
      return {
        success: false,
        integrationId: integration._id,
        integrationIdentifier: integration.identifier,
        callbackUrl: webhookResult.callbackUrl,
        wabaId,
        phoneRegistrationWarning,
        error: {
          code: 'webhook_configuration_failed',
          message:
            webhookResult.reason?.message ??
            'Credentials were saved, but Novu could not register the webhook with Meta automatically.',
        },
        webhookReason: webhookResult.reason,
      };
    }

    return {
      success: true,
      integrationId: integration._id,
      integrationIdentifier: integration.identifier,
      callbackUrl: webhookResult.callbackUrl,
      wabaId,
      displayPhoneNumber: businessDisplayPhone,
      phoneRegistrationWarning,
    };
  }
}
