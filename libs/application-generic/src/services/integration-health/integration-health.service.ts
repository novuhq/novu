import { Injectable } from '@nestjs/common';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  IIntegrationHealth,
  IntegrationHealthErrorCodeEnum,
  IntegrationHealthSourceEnum,
  IntegrationHealthStatusEnum,
  SmsProviderIdEnum,
} from '@novu/shared';
import { PinoLogger } from '../../logging';

/** Novu owns the credentials of its demo providers, so their failures are never the user's to fix. */
const NOVU_MANAGED_PROVIDERS: ReadonlySet<string> = new Set([
  EmailProviderIdEnum.Novu,
  SmsProviderIdEnum.Novu,
  ChatProviderIdEnum.Novu,
]);

/**
 * Chat providers that authenticate sends with the integration's own credentials. The others (Slack, Discord,
 * webhooks…) send with a token or URL stored on each subscriber's endpoint, so a rejection there is about one
 * recipient's workspace, not the integration.
 */
const CHAT_PROVIDERS_WITH_INTEGRATION_CREDENTIALS: ReadonlySet<string> = new Set([
  ChatProviderIdEnum.Telegram,
  ChatProviderIdEnum.WhatsAppBusiness,
  ChatProviderIdEnum.Line,
  ChatProviderIdEnum.MsTeams,
]);

const HEALTH_CHANNELS: ReadonlySet<string> = new Set([
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.SMS,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.CHAT,
]);

const REVOKED_PATTERN = /token[_\s-]?revoked|app[_\s-]?uninstalled/i;
const EXPIRED_PATTERN = /token[_\s-]?expired|expired[_\s-]?token|key[_\s-]?expired|ExpiredProviderToken/i;
const INVALID_PATTERN = new RegExp(
  [
    'invalid[_\\s-]?auth',
    'not[_\\s-]?authed',
    'invalid[_\\s-]?client',
    'unauthorized[_\\s-]?client',
    'invalid[_\\s-]?api[_\\s-]?key',
    'invalid[_\\s-]?credential',
    'bad[_\\s-]?credentials',
    'authentication failed',
    // OAuth service accounts (FCM): Google answers a bad or deleted key with invalid_grant.
    'invalid_grant',
    // Mandrill's error name for an unknown API key.
    'Invalid_Key',
    // APNs: the team / key id / signing key don't match.
    'InvalidProviderToken',
    // SDKs that rethrow axios errors keep only its message.
    'status code 401\\b',
    // Resend rethrows only the API's message for a 403 invalid_api_key.
    'api key is invalid',
    // Brevo's error body for an unknown key, which Brevo SMS puts in its error message.
    '"code":\\s*"unauthori[sz]ed"',
  ].join('|'),
  'i'
);

/** AWS (SES, SNS) error names for credentials the account doesn't accept. AWS answers these with a 403. */
const AWS_INVALID_CREDENTIAL_ERRORS: ReadonlySet<string> = new Set([
  'UnrecognizedClientException',
  'InvalidClientTokenId',
  'InvalidAccessKeyId',
  'SignatureDoesNotMatch',
  'InvalidSignatureException',
  'IncompleteSignature',
  'AuthFailure',
]);
const AWS_EXPIRED_CREDENTIAL_ERRORS: ReadonlySet<string> = new Set(['ExpiredToken', 'ExpiredTokenException']);

/** emailjs `SMTPErrorStates.AUTHFAILED`. */
const EMAILJS_AUTH_FAILED = 3;

/**
 * Tracks whether each integration's provider accepts its credentials (`integration.health`).
 *
 * Called on the trigger → worker → provider path, so it does no reads: it decides from the integration the send
 * already loaded, and writes only when the status flips (healthy → error on a rejected send, error → healthy on the
 * next success). Each write is a conditional update, so concurrent sends that race on the same flip write once.
 * It never throws: a failed health write must not fail the send.
 */
@Injectable()
export class IntegrationHealthService {
  constructor(
    private integrationRepository: IntegrationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async recordSendFailure(integration: IntegrationEntity, error: unknown): Promise<void> {
    if (!this.isTracked(integration)) return;
    if (integration.health?.status === IntegrationHealthStatusEnum.ERROR) return;

    const code = IntegrationHealthService.classifyError(error);
    if (!code) return;

    await this.markError(integration, code, IntegrationHealthSourceEnum.SEND);
  }

  async recordSendSuccess(integration: IntegrationEntity): Promise<void> {
    if (integration.health?.status !== IntegrationHealthStatusEnum.ERROR) return;

    await this.markHealthy(integration, IntegrationHealthSourceEnum.SEND);
  }

  /** A connection test is an explicit user action, so it always writes its conclusion. */
  async recordCheckResult(integration: IntegrationEntity, isValid: boolean): Promise<void> {
    if (isValid) {
      await this.markHealthy(integration, IntegrationHealthSourceEnum.CHECK);

      return;
    }

    if (integration.health?.status === IntegrationHealthStatusEnum.ERROR) return;

    await this.markError(
      integration,
      IntegrationHealthErrorCodeEnum.INVALID_CREDENTIALS,
      IntegrationHealthSourceEnum.CHECK
    );
  }

  /**
   * Maps a provider error to a health error code, or `undefined` when it doesn't prove the credentials are bad.
   * Only a 401 or a provider's own "revoked / expired / invalid key" answer counts. 403, 429, 5xx, timeouts and
   * recipient errors never do, so an outage or a bad address never turns a card red.
   */
  static classifyError(error: unknown): IntegrationHealthErrorCodeEnum | undefined {
    const text = getErrorText(error);
    const name = getErrorName(error);

    if (REVOKED_PATTERN.test(text)) return IntegrationHealthErrorCodeEnum.TOKEN_REVOKED;
    if (EXPIRED_PATTERN.test(text) || AWS_EXPIRED_CREDENTIAL_ERRORS.has(name)) {
      return IntegrationHealthErrorCodeEnum.TOKEN_EXPIRED;
    }
    if (
      getErrorHttpStatus(error) === 401 ||
      AWS_INVALID_CREDENTIAL_ERRORS.has(name) ||
      isSmtpAuthFailure(error) ||
      INVALID_PATTERN.test(text)
    ) {
      return IntegrationHealthErrorCodeEnum.INVALID_CREDENTIALS;
    }

    return undefined;
  }

  private isTracked(integration: IntegrationEntity): boolean {
    if (!integration.channel || !HEALTH_CHANNELS.has(integration.channel)) return false;
    if (NOVU_MANAGED_PROVIDERS.has(integration.providerId)) return false;
    if (integration.channel === ChannelTypeEnum.CHAT) {
      return CHAT_PROVIDERS_WITH_INTEGRATION_CREDENTIALS.has(integration.providerId);
    }

    return true;
  }

  private async markError(
    integration: IntegrationEntity,
    code: IntegrationHealthErrorCodeEnum,
    source: IntegrationHealthSourceEnum
  ): Promise<void> {
    const now = new Date().toISOString();
    const health: IIntegrationHealth = {
      status: IntegrationHealthStatusEnum.ERROR,
      code,
      failedAt: now,
      updatedAt: now,
      source,
    };

    await this.write(integration, { 'health.status': { $ne: IntegrationHealthStatusEnum.ERROR } }, health);
  }

  private async markHealthy(integration: IntegrationEntity, source: IntegrationHealthSourceEnum): Promise<void> {
    const health: IIntegrationHealth = {
      status: IntegrationHealthStatusEnum.HEALTHY,
      updatedAt: new Date().toISOString(),
      source,
    };

    await this.write(integration, { 'health.status': IntegrationHealthStatusEnum.ERROR }, health);
  }

  private async write(
    integration: IntegrationEntity,
    condition: Record<string, unknown>,
    health: IIntegrationHealth
  ): Promise<void> {
    try {
      const { modified } = await this.integrationRepository.update(
        {
          _id: integration._id,
          _environmentId: integration._environmentId,
          _organizationId: integration._organizationId,
          ...condition,
        },
        { $set: { health } },
        // Health isn't a configuration change, so it leaves the integration's "Updated" time alone.
        { timestamps: false }
      );

      if (modified > 0) {
        integration.health = health;
        this.logger.info(
          {
            integrationId: integration._id,
            providerId: integration.providerId,
            status: health.status,
            code: health.code,
          },
          'Integration health changed'
        );
      }
    } catch (error) {
      this.logger.warn(
        { integrationId: integration._id, providerId: integration.providerId, error: (error as Error)?.message },
        'Could not record integration health'
      );
    }
  }
}

/** Reads the HTTP status off the error shapes provider SDKs throw (axios, got, Twilio, Vonage, SendGrid, AWS v3). */
function getErrorHttpStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const candidate = error as {
    response?: { status?: unknown; statusCode?: unknown };
    $metadata?: { httpStatusCode?: unknown };
    status?: unknown;
    statusCode?: unknown;
    code?: unknown;
  };
  const values = [
    candidate.$metadata?.httpStatusCode,
    candidate.response?.status,
    candidate.response?.statusCode,
    candidate.status,
    candidate.statusCode,
    candidate.code,
  ];

  for (const value of values) {
    const status = typeof value === 'string' ? Number(value) : value;

    if (typeof status === 'number' && Number.isInteger(status) && status >= 100 && status < 600) {
      return status;
    }
  }

  return undefined;
}

/** The error's `name` (AWS SDK v3 puts its error code there), or its `Code` for older AWS shapes. */
function getErrorName(error: unknown): string {
  if (!error || typeof error !== 'object') return '';
  const { name, Code } = error as { name?: unknown; Code?: unknown };

  if (typeof Code === 'string') return Code;

  return typeof name === 'string' ? name : '';
}

/** A rejected SMTP login: nodemailer's `EAUTH` (Outlook 365, SMTP) or emailjs's AUTHFAILED. */
function isSmtpAuthFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const { code, constructor } = error as { code?: unknown; constructor?: { name?: string } };

  return code === 'EAUTH' || (constructor?.name === 'SMTPError' && code === EMAILJS_AUTH_FAILED);
}

/** The error's message, code and provider error body, for matching only. Never stored or returned. */
function getErrorText(error: unknown): string {
  if (!error) return '';
  if (typeof error === 'string') return error;
  if (typeof error !== 'object') return '';

  const candidate = error as {
    message?: unknown;
    code?: unknown;
    error?: unknown;
    response?: { data?: unknown; body?: unknown };
  };
  const parts = [
    candidate.message,
    candidate.code,
    candidate.error,
    candidate.response?.data,
    candidate.response?.body,
  ];

  return parts
    .map((part) => {
      if (typeof part === 'string') return part;
      if (part && typeof part === 'object') {
        try {
          return JSON.stringify(part).slice(0, 2_000);
        } catch {
          return '';
        }
      }

      return '';
    })
    .join(' ');
}
