import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { decryptCredentials, FeatureFlagsService, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, type IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { FeatureFlagsKeysEnum, type ICredentials } from '@novu/shared';
import { isAgentWebhookUrl } from '../../../agents/channels/shared/resolve-agent-integration-webhook.util';
import { ConfigureWhatsAppWebhookCommand } from '../../../agents/channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.command';
import { ConfigureWhatsAppWebhook } from '../../../agents/channels/whatsapp/configure-whatsapp-webhook/configure-whatsapp-webhook.usecase';
import { humanRelayProfile } from '../../../agents/human-relay/human-relay-identity';
import { AgentInboxFeaturesService } from '../../../human/services/agent-inbox-features.service';
import type { WhatsAppEmbeddedSignupResponseDto } from '../../dtos/whatsapp-embedded-signup.dto';
import { UpdateIntegrationCommand } from '../update-integration/update-integration.command';
import { UpdateIntegration } from '../update-integration/update-integration.usecase';
import {
  type ResolvedWhatsAppAgentIntegration,
  resolveWhatsAppAgentIntegration,
  resolveWhatsAppIntegration,
} from './resolve-whatsapp-agent-integration.utils';
import { WhatsAppBusinessProfile } from './whatsapp-business-profile.service';
import { getNovuWhatsAppPlatformConfig } from './whatsapp-credentials.utils';
import { WhatsAppEmbeddedSignupCommand } from './whatsapp-embedded-signup.command';
import {
  exchangeEmbeddedSignupCodeForToken,
  extractMetaError,
  generateWhatsAppRegistrationPin,
  getPhoneNumberDetails,
  listWabaPhoneNumbers,
  listWabaSubscribedApps,
  type PhoneNumberDetailsResponse,
  registerWhatsAppPhoneNumber,
} from './whatsapp-graph-api.utils';

@Injectable()
export class WhatsAppEmbeddedSignup {
  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly updateIntegration: UpdateIntegration,
    private readonly configureWhatsAppWebhook: ConfigureWhatsAppWebhook,
    private readonly businessProfile: WhatsAppBusinessProfile,
    private readonly agentInboxFeatures: AgentInboxFeaturesService,
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

    // The integration store connects a number with no agent: only the credentials are saved. Linking an agent
    // does not register the webhook by itself; the agent setup guide does (ConfigureWhatsAppWebhook, or this
    // use case run again with the agent). The signup is refused when the business account already delivers
    // to another integration's agent, see `findWebhookConflict`.
    const agentIdentifier = command.agentIdentifier;
    const { agent, integration } = agentIdentifier
      ? await resolveWhatsAppAgentIntegration({
          agentRepository: this.agentRepository,
          integrationRepository: this.integrationRepository,
          agentIntegrationRepository: this.agentIntegrationRepository,
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentIdentifier,
          integrationIdentifier: command.integrationIdentifier,
        })
      : {
          agent: undefined,
          integration: await resolveWhatsAppIntegration({
            integrationRepository: this.integrationRepository,
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            integrationIdentifier: command.integrationIdentifier,
          }),
        };

    const exchanged = await this.exchangeCode(platformConfig, command.code, integration._id);
    if (typeof exchanged !== 'string') {
      return exchanged;
    }
    const accessToken = exchanged;

    const phoneNumberId = command.phoneNumberId.trim();
    const wabaId = command.wabaId.trim();

    if (!phoneNumberId || !wabaId) {
      throw new BadRequestException('phoneNumberId and wabaId must be non-empty values.');
    }

    const existingCredentials = integration.credentials ? decryptCredentials(integration.credentials) : undefined;

    const verified = await this.verifyNumber(accessToken, phoneNumberId, wabaId, integration._id);
    if ('success' in verified) {
      return verified;
    }
    const { businessDisplayPhone } = verified;

    if (!agent) {
      const conflict = await this.findWebhookConflict(accessToken, wabaId, integration, command);
      if (conflict) {
        return conflict;
      }
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
        allowNovuManagedWhatsAppCredentials: true,
      })
    );

    const phoneRegistrationWarning = await this.registerNumber(accessToken, phoneNumberId, integration._id);

    if (!agent || !agentIdentifier) {
      return {
        success: true,
        integrationId: integration._id,
        integrationIdentifier: integration.identifier,
        wabaId,
        displayPhoneNumber: businessDisplayPhone,
        phoneRegistrationWarning,
      };
    }

    await this.applyRelayProfile(agent, integration._id, command, { accessToken, phoneNumberId, isNovuManaged: true });

    const webhookResult = await this.configureWhatsAppWebhook.execute(
      ConfigureWhatsAppWebhookCommand.create({
        userId: command.userId,
        organizationId: command.organizationId,
        environmentId: command.environmentId,
        agentIdentifier,
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

  /** Swaps the Embedded Signup code for the business's access token, or answers with why that failed. */
  private async exchangeCode(
    platformConfig: { appId: string; appSecret: string },
    code: string,
    integrationId: string
  ): Promise<string | WhatsAppEmbeddedSignupResponseDto> {
    let accessToken: string;
    try {
      const exchange = await exchangeEmbeddedSignupCodeForToken({
        appId: platformConfig.appId,
        appSecret: platformConfig.appSecret,
        code: code,
      });
      const exchangeError = extractMetaError(exchange.body);
      accessToken = typeof exchange.body.access_token === 'string' ? exchange.body.access_token.trim() : '';

      if (exchangeError || exchange.statusCode >= 400 || !accessToken) {
        this.logger.warn(
          {
            integrationId: integrationId,
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
      this.logger.warn({ err, integrationId: integrationId }, 'WhatsApp embedded signup: token exchange call failed');

      return {
        success: false,
        error: {
          code: 'token_exchange_failed',
          message: 'Could not reach Meta to exchange the authorization code. Try again.',
        },
      };
    }

    return accessToken;
  }

  /**
   * Checks with Meta that the number exists and belongs to the business account, and returns its display number,
   * or answers with why the check failed.
   */
  private async verifyNumber(
    accessToken: string,
    phoneNumberId: string,
    wabaId: string,
    integrationId: string
  ): Promise<{ businessDisplayPhone: string | undefined } | WhatsAppEmbeddedSignupResponseDto> {
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
        { err, integrationId: integrationId, phoneNumberId },
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
        { err, integrationId: integrationId, wabaId, phoneNumberId },
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

    return { businessDisplayPhone };
  }

  /**
   * The webhook callback is set per business account, not per number, and a signup with no agent leaves it as
   * it is. If it points at another integration's agent, that agent would keep receiving this account's messages
   * while the credentials move here, so the signup is refused. Nothing on Meta's side is changed: the other
   * agent may be using another number of the same account. A callback of an agent linked to this integration
   * is fine. Answers with the failure to return, or undefined when there is no conflict.
   */
  private async findWebhookConflict(
    accessToken: string,
    wabaId: string,
    integration: IntegrationEntity,
    command: WhatsAppEmbeddedSignupCommand
  ): Promise<WhatsAppEmbeddedSignupResponseDto | undefined> {
    const unreadable: WhatsAppEmbeddedSignupResponseDto = {
      success: false,
      error: {
        code: 'meta_validation_failed',
        message: 'Could not check the webhook of the WhatsApp Business Account with Meta. Try again.',
      },
    };

    let callbacks: string[];
    try {
      const subscribedApps = await listWabaSubscribedApps(accessToken, wabaId);
      const metaError = extractMetaError(subscribedApps.body);

      if (metaError || subscribedApps.statusCode >= 400) {
        this.logger.warn(
          { integrationId: integration._id, wabaId, statusCode: subscribedApps.statusCode, metaError },
          'WhatsApp embedded signup: could not read the subscribed apps of the business account'
        );

        return unreadable;
      }

      callbacks = (subscribedApps.body.data ?? [])
        .map((app) => app.override_callback_uri?.trim() ?? '')
        .filter((callback) => callback && isAgentWebhookUrl(callback));
    } catch (err) {
      this.logger.warn(
        { err, integrationId: integration._id, wabaId },
        'WhatsApp embedded signup: subscribed apps lookup failed'
      );

      return unreadable;
    }

    for (const callback of callbacks) {
      if (!(await this.isOwnAgentWebhook(callback, integration, command))) {
        this.logger.warn(
          { integrationId: integration._id, wabaId },
          'WhatsApp embedded signup: business account already delivers to another agent webhook'
        );

        return {
          success: false,
          error: {
            code: 'webhook_in_use',
            message:
              'This WhatsApp Business Account already delivers its messages to another Novu agent. Disconnect it there first, or use Manual setup with your own Meta app.',
          },
        };
      }
    }

    return undefined;
  }

  /** True when the callback is the webhook of an agent linked to this integration, in this environment. */
  private async isOwnAgentWebhook(
    callback: string,
    integration: IntegrationEntity,
    command: WhatsAppEmbeddedSignupCommand
  ): Promise<boolean> {
    let segments: string[];
    try {
      segments = new URL(callback).pathname.split('/').filter(Boolean);
    } catch {
      return false;
    }

    // `/v1/agents/{agentId}/webhook/{integrationIdentifier}`
    const integrationIdentifier = segments.at(-1);
    const agentId = segments.at(-3) ?? '';

    if (integrationIdentifier !== integration.identifier || !/^[a-f0-9]{24}$/i.test(agentId)) {
      return false;
    }

    const link = await this.agentIntegrationRepository.findOne(
      {
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
        _agentId: agentId,
        _integrationId: integration._id,
      },
      ['_id']
    );

    return !!link;
  }

  /** Registers the number for the Cloud API. Best-effort: returns a warning to show, never fails the signup. */
  private async registerNumber(
    accessToken: string,
    phoneNumberId: string,
    integrationId: string
  ): Promise<string | undefined> {
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
            integrationId: integrationId,
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
        { err, integrationId: integrationId, phoneNumberId: phoneNumberId },
        'WhatsApp embedded signup: phone registration call failed (best-effort)'
      );
    }

    return phoneRegistrationWarning;
  }

  /**
   * A relay agent speaks as itself, so the number takes the description and picture its operator gave it. With no
   * picture, a number that has no photo yet takes the agent's mascot, in the look its mascots show. Never fails the
   * signup: the profile is not needed to deliver a message.
   */
  /**
   * Puts a relay agent's photo and description on the number it was just connected to. The credentials are saved
   * by now, so nothing here may fail the signup: a failure is logged and the signup goes on.
   */
  private async applyRelayProfile(
    agent: ResolvedWhatsAppAgentIntegration['agent'],
    integrationId: string,
    command: WhatsAppEmbeddedSignupCommand,
    number: { accessToken: string; phoneNumberId: string; isNovuManaged: boolean }
  ): Promise<void> {
    if (agent.runtime !== 'human_relay') {
      return;
    }

    try {
      // A number other agents speak through too keeps the profile it has.
      const otherAgent = await this.agentIntegrationRepository.findOne(
        {
          _integrationId: integrationId,
          _agentId: { $ne: agent._id },
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        ['_id']
      );
      if (otherAgent) {
        return;
      }

      const picture = agent.picture?.storageKey ? agent.picture : undefined;
      const mascot = picture
        ? null
        : await this.agentInboxFeatures.mascotLookOf({ _organizationId: command.organizationId, look: agent.look });

      await this.businessProfile.apply(number, {
        description: humanRelayProfile({ description: agent.description }).description,
        picture: picture ?? 'default-if-none',
        mascot,
      });
    } catch (err) {
      this.logger.warn(
        { err: err instanceof Error ? err.message : String(err), integrationId },
        'WhatsApp embedded signup: could not set the business profile of the number.'
      );
    }
  }
}
