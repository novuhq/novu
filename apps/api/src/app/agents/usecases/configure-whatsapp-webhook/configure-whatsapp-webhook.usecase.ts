import { Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';

import {
  debugAccessToken,
  extractMetaError,
  type MetaErrorSummary,
  subscribeAppToWhatsAppEvents,
  subscribeWabaMessagesField,
  WHATSAPP_BUSINESS_MANAGEMENT_SCOPE,
} from '../../../integrations/usecases/whatsapp/whatsapp-graph-api.utils';
import { ConfigureWhatsAppWebhookCommand } from './configure-whatsapp-webhook.command';

export type ConfigureWhatsAppWebhookFailure = {
  code:
    | 'missing_management_scope'
    | 'missing_credentials'
    | 'missing_verify_token'
    | 'missing_app_secret'
    | 'app_subscription_failed'
    | 'meta_rejected'
    | 'unknown';
  message: string;
};

export interface ConfigureWhatsAppWebhookResult {
  success: boolean;
  callbackUrl: string;
  wabaId?: string;
  fallbackToManual?: boolean;
  reason?: ConfigureWhatsAppWebhookFailure;
}

function buildAgentWebhookUrl(agentId: string, integrationIdentifier: string): string {
  // Prefer `AGENT_API_HOSTNAME` (a publicly reachable HTTPS host the chat
  // platforms can call back to — typically a tunnel URL in dev) and fall back
  // to the standard `API_ROOT_URL`. Meta refuses to register webhooks pointed
  // at `*.localhost`, so this override is the recommended dev workflow.
  const base = (process.env.AGENT_API_HOSTNAME ?? process.env.API_ROOT_URL ?? '').replace(/\/$/, '');

  if (!base) {
    throw new Error(
      `buildAgentWebhookUrl: neither AGENT_API_HOSTNAME nor API_ROOT_URL is configured (agentId="${agentId}", integrationIdentifier="${integrationIdentifier}")`
    );
  }

  return `${base}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
}

@Injectable()
export class ConfigureWhatsAppWebhook {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: ConfigureWhatsAppWebhookCommand): Promise<ConfigureWhatsAppWebhookResult> {
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
    // before exposing webhook configuration on it. Without this check an
    // `AGENT_WRITE` caller could rebind webhooks for an unrelated WhatsApp
    // integration in the same tenant.
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

    const callbackUrl = buildAgentWebhookUrl(agent._id, integration.identifier);
    const credentials = decryptCredentials(integration.credentials ?? {});

    const accessToken = typeof credentials.apiToken === 'string' ? credentials.apiToken.trim() : '';
    const verifyToken = typeof credentials.token === 'string' ? credentials.token.trim() : '';
    const wabaId = typeof credentials.businessAccountId === 'string' ? credentials.businessAccountId.trim() : '';
    const appSecret = typeof credentials.secretKey === 'string' ? credentials.secretKey.trim() : '';

    if (!accessToken || !wabaId) {
      return {
        success: false,
        callbackUrl,
        fallbackToManual: true,
        reason: {
          code: 'missing_credentials',
          message: 'Save the access token and WhatsApp Business Account ID in the credentials form before connecting.',
        },
      };
    }

    if (!verifyToken) {
      // The verify token is auto-generated server-side in create/update
      // integration use cases, so an empty value here indicates a stale
      // record from before the migration or an internal misconfiguration —
      // not something the user can fix on the credentials form.
      this.logger.warn(
        { agentId: agent._id, integrationId: integration._id },
        'WhatsApp auto-configure: verify token missing on integration credentials'
      );

      return {
        success: false,
        callbackUrl,
        fallbackToManual: true,
        reason: {
          code: 'missing_verify_token',
          message:
            "Novu couldn't find the auto-generated verify token for this integration. Re-save the credentials to regenerate it, then try again.",
        },
      };
    }

    if (!appSecret) {
      return {
        success: false,
        callbackUrl,
        fallbackToManual: true,
        reason: {
          code: 'missing_app_secret',
          message:
            'Save the App Secret in the credentials form — Novu needs it to subscribe your Meta app to WhatsApp webhooks.',
        },
      };
    }

    // Look up the Meta App ID from the access token. Required for the
    // app-level subscription Meta demands before per-WABA `subscribed_apps`
    // accepts an `override_callback_uri`.
    let appId: string | undefined;
    try {
      const debug = await debugAccessToken(accessToken);
      appId = debug.body.data?.app_id;
    } catch (err) {
      this.logger.warn(
        { err, agentId: agent._id, integrationId: integration._id },
        'WhatsApp auto-configure: debug_token call failed'
      );
    }

    if (!appId) {
      return {
        success: false,
        callbackUrl,
        wabaId,
        fallbackToManual: true,
        reason: {
          code: 'unknown',
          message:
            "Couldn't resolve your Meta App ID from the access token. Try regenerating the token, or finish setup manually in your Meta app.",
        },
      };
    }

    // App-level subscription: registers Novu as the webhook callback for the
    // `messages` field on `whatsapp_business_account` events. Meta refuses
    // per-WABA `override_callback_uri` calls until this is in place.
    let appSubscription: Awaited<ReturnType<typeof subscribeAppToWhatsAppEvents>>;
    try {
      appSubscription = await subscribeAppToWhatsAppEvents({
        appId,
        appSecret,
        callbackUrl,
        verifyToken,
      });
    } catch (err) {
      this.logger.warn(
        { err, agentId: agent._id, integrationId: integration._id, appId },
        'WhatsApp auto-configure: app-level subscription call failed'
      );

      return {
        success: false,
        callbackUrl,
        wabaId,
        fallbackToManual: true,
        reason: {
          code: 'unknown',
          message: 'Could not reach Meta to register the app webhook. Try again, or finish the setup manually.',
        },
      };
    }

    const appSubError = extractMetaError(appSubscription.body);
    if (appSubError || appSubscription.statusCode >= 400) {
      this.logger.warn(
        {
          agentId: agent._id,
          integrationId: integration._id,
          appId,
          statusCode: appSubscription.statusCode,
          metaError: appSubError,
        },
        'WhatsApp auto-configure: Meta rejected app-level subscription'
      );

      return {
        success: false,
        callbackUrl,
        wabaId,
        fallbackToManual: true,
        reason: {
          code: 'app_subscription_failed',
          message:
            appSubError?.message ?? `Meta rejected the app webhook subscription (HTTP ${appSubscription.statusCode}).`,
        },
      };
    }

    let response: Awaited<ReturnType<typeof subscribeWabaMessagesField>>;
    try {
      response = await subscribeWabaMessagesField({
        accessToken,
        wabaId,
        callbackUrl,
        verifyToken,
      });
    } catch (err) {
      this.logger.warn(
        { err, agentId: agent._id, integrationId: integration._id, wabaId },
        'WhatsApp auto-configure: subscribed_apps call failed'
      );

      return {
        success: false,
        callbackUrl,
        wabaId,
        fallbackToManual: true,
        reason: {
          code: 'unknown',
          message:
            'Could not reach Meta to subscribe the webhook. Try again, or finish the setup manually in your Meta app.',
        },
      };
    }

    const error = extractMetaError(response.body);
    if (error || response.statusCode >= 400) {
      const failure = this.classifyMetaError(error, response.statusCode);

      this.logger.warn(
        {
          agentId: agent._id,
          integrationId: integration._id,
          wabaId,
          statusCode: response.statusCode,
          metaError: error,
        },
        'WhatsApp auto-configure: Meta rejected subscription'
      );

      return {
        success: false,
        callbackUrl,
        wabaId,
        fallbackToManual: true,
        reason: failure,
      };
    }

    if (response.body.success === false) {
      return {
        success: false,
        callbackUrl,
        wabaId,
        fallbackToManual: true,
        reason: {
          code: 'meta_rejected',
          message: 'Meta did not confirm the webhook subscription. Finish the setup manually in your Meta app.',
        },
      };
    }

    return { success: true, callbackUrl, wabaId };
  }

  private classifyMetaError(error: MetaErrorSummary | undefined, statusCode: number): ConfigureWhatsAppWebhookFailure {
    const message = error?.message ?? `Meta returned HTTP ${statusCode}`;
    // Meta surfaces missing-permission errors as code 200 / 10 / 200.x.
    if (error?.code === 200 || error?.code === 10) {
      return {
        code: 'missing_management_scope',
        message: `This access token can't manage webhooks for your business. Ask Meta to grant the "${WHATSAPP_BUSINESS_MANAGEMENT_SCOPE}" permission, or finish the setup manually.`,
      };
    }

    return {
      code: 'meta_rejected',
      message,
    };
  }
}
