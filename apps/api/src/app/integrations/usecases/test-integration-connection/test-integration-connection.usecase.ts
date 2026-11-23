import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ChannelFactory,
  GetDecryptedIntegrations,
  InstrumentUsecase,
  IntegrationHealthService,
  MsTeamsTokenService,
  PinoLogger,
} from '@novu/application-generic';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import {
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  IntegrationConnectionStatusEnum,
  ITestIntegrationConnectionResponse,
  SmsProviderIdEnum,
} from '@novu/shared';
import { IVerifyCredentialsResponse, VerifyCredentialsStatusEnum } from '@novu/stateless';
import axios from 'axios';
import { TestIntegrationConnectionCommand } from './test-integration-connection.command';

type HandlerChannel = 'email' | 'sms' | 'chat' | 'push' | 'tool';

const HANDLER_CHANNELS: ReadonlySet<string> = new Set<HandlerChannel>(['email', 'sms', 'chat', 'push', 'tool']);

/** Novu-managed demo integrations: their credentials belong to Novu, so there's nothing for the user to test. */
const NOVU_MANAGED_PROVIDERS: ReadonlySet<string> = new Set([
  EmailProviderIdEnum.Novu,
  SmsProviderIdEnum.Novu,
  ChatProviderIdEnum.Novu,
]);

const AZURE_AD_INVALID_CREDENTIAL_ERRORS = new Set(['invalid_client', 'unauthorized_client']);

const MESSAGES: Record<IntegrationConnectionStatusEnum, string> = {
  [IntegrationConnectionStatusEnum.VALID]: 'The provider accepted these credentials.',
  [IntegrationConnectionStatusEnum.INVALID]: 'The provider rejected these credentials.',
  [IntegrationConnectionStatusEnum.UNREACHABLE]: "Couldn't reach the provider to check these credentials.",
  [IntegrationConnectionStatusEnum.INCONCLUSIVE]: "The provider answered, but these credentials couldn't be confirmed.",
  [IntegrationConnectionStatusEnum.UNSUPPORTED]: "Connection testing isn't available for this provider yet.",
};

/**
 * "Verify integration": checks an integration's stored credentials against its provider with a read-only call.
 *
 * A single failure is never trusted. The check runs up to `RETRY_DELAYS_MS.length + 1` times and stops early on a
 * conclusive answer (valid / inconclusive / unsupported). It reports INVALID only when *every* attempt was rejected,
 * so a flaky network or a provider blip isn't reported as bad credentials. A VALID or INVALID answer is recorded as
 * the integration's health (Healthy / Error); every other answer leaves it alone.
 *
 * Runs only on an explicit user click, never on the trigger → worker → provider path.
 */
@Injectable()
export class TestIntegrationConnection {
  /** Wait before each retry. Exposed so tests can run without real delays. */
  static RETRY_DELAYS_MS: number[] = [1_000, 3_000];

  /**
   * Hard cap per attempt. HTTP checks already time out at 10s, but SDK-backed ones (Twilio, Vonage, FCM, email
   * `checkIntegration`) use their own clients, so the cap is enforced here for all of them.
   */
  static ATTEMPT_TIMEOUT_MS = 15_000;

  constructor(
    private integrationRepository: IntegrationRepository,
    private msTeamsTokenService: MsTeamsTokenService,
    private integrationHealthService: IntegrationHealthService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: TestIntegrationConnectionCommand): Promise<ITestIntegrationConnectionResponse> {
    const encryptedIntegration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!encryptedIntegration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (NOVU_MANAGED_PROVIDERS.has(encryptedIntegration.providerId)) {
      return {
        status: IntegrationConnectionStatusEnum.UNSUPPORTED,
        message: "Novu manages this demo integration's credentials, so there's nothing to test.",
        attempts: 0,
      };
    }

    const integration = GetDecryptedIntegrations.getDecryptedCredentials(encryptedIntegration);
    const statuses: VerifyCredentialsStatusEnum[] = [];
    let last: IVerifyCredentialsResponse | null = null;

    for (let attempt = 0; attempt <= TestIntegrationConnection.RETRY_DELAYS_MS.length; attempt += 1) {
      if (attempt > 0) await sleep(TestIntegrationConnection.RETRY_DELAYS_MS[attempt - 1]);

      last = await withDeadline(this.verifyOnce(integration), TestIntegrationConnection.ATTEMPT_TIMEOUT_MS, {
        status: VerifyCredentialsStatusEnum.UNREACHABLE,
      });

      if (!last) {
        return {
          status: IntegrationConnectionStatusEnum.UNSUPPORTED,
          message: MESSAGES.unsupported,
          attempts: 0,
        };
      }

      statuses.push(last.status);

      const isRetryable =
        last.status === VerifyCredentialsStatusEnum.INVALID || last.status === VerifyCredentialsStatusEnum.UNREACHABLE;
      if (!isRetryable) break;
    }

    const status = this.conclude(statuses);

    if (status === IntegrationConnectionStatusEnum.VALID || status === IntegrationConnectionStatusEnum.INVALID) {
      await this.integrationHealthService.recordCheckResult(
        encryptedIntegration,
        status === IntegrationConnectionStatusEnum.VALID
      );
    }

    this.logger.info(
      {
        integrationId: integration._id,
        providerId: integration.providerId,
        status,
        attempts: statuses,
      },
      'Tested integration connection'
    );

    return {
      status,
      message: status === (last?.status as string) && last?.message ? last.message : MESSAGES[status],
      attempts: statuses.length,
    };
  }

  /** INVALID only when every attempt said so; a mix of rejections and outages is treated as an outage. */
  private conclude(statuses: VerifyCredentialsStatusEnum[]): IntegrationConnectionStatusEnum {
    const final = statuses[statuses.length - 1];

    if (final === VerifyCredentialsStatusEnum.VALID) return IntegrationConnectionStatusEnum.VALID;
    if (final === VerifyCredentialsStatusEnum.INCONCLUSIVE) return IntegrationConnectionStatusEnum.INCONCLUSIVE;
    if (statuses.every((status) => status === VerifyCredentialsStatusEnum.INVALID)) {
      return IntegrationConnectionStatusEnum.INVALID;
    }

    return IntegrationConnectionStatusEnum.UNREACHABLE;
  }

  /** One check against the provider; `null` when the provider has no check. Never throws for provider answers. */
  private async verifyOnce(integration: IntegrationEntity): Promise<IVerifyCredentialsResponse | null> {
    if (integration.providerId === ChatProviderIdEnum.MsTeams) {
      return this.verifyMsTeams(integration);
    }

    if (!integration.channel || !HANDLER_CHANNELS.has(integration.channel)) {
      return null;
    }

    let handler: ReturnType<ChannelFactory['getHandler']>;
    try {
      // A fresh factory per check: factories reuse handler instances, and building one swaps its provider.
      // Email handlers take the sender through options, as sends and `CheckIntegrationEMail` do.
      handler = new ChannelFactory().getHandler(integration, integration.channel as HandlerChannel, {
        from: integration.credentials?.from,
      });
    } catch (error) {
      // No handler for this provider, or its constructor refused the stored credentials.
      this.logger.warn(
        { integrationId: integration._id, providerId: integration.providerId, error: (error as Error)?.name },
        'Could not build provider for connection test'
      );

      return null;
    }

    try {
      return await handler.verifyCredentials();
    } catch (error) {
      this.logger.warn(
        { integrationId: integration._id, providerId: integration.providerId, error: (error as Error)?.name },
        'Provider connection test threw'
      );

      return { status: VerifyCredentialsStatusEnum.UNREACHABLE };
    }
  }

  /**
   * MS Teams: an app-only Graph token is only issued for a valid client id / secret / tenant. The token is requested
   * fresh (not from the 55-minute cache), so a secret revoked since the last send is caught.
   * Without bot app credentials the integration delivers through incoming webhooks, which have nothing to check.
   */
  private async verifyMsTeams(integration: IntegrationEntity): Promise<IVerifyCredentialsResponse | null> {
    const credentials = (integration.credentials ?? {}) as Record<string, string | undefined>;
    const { clientId, secretKey, tenantId } = credentials;

    if (!clientId || !secretKey || !tenantId) {
      return null;
    }

    try {
      const isIssued = await this.msTeamsTokenService.verifyGraphCredentials(clientId, secretKey, tenantId);

      return { status: isIssued ? VerifyCredentialsStatusEnum.VALID : VerifyCredentialsStatusEnum.UNREACHABLE };
    } catch (error) {
      if (!axios.isAxiosError(error) || !error.response) return { status: VerifyCredentialsStatusEnum.UNREACHABLE };

      const { status, data } = error.response;
      const aadError = (data as { error?: string } | undefined)?.error;

      if (status === 401 || (aadError && AZURE_AD_INVALID_CREDENTIAL_ERRORS.has(aadError))) {
        return { status: VerifyCredentialsStatusEnum.INVALID };
      }

      if (status === 429 || status >= 500) return { status: VerifyCredentialsStatusEnum.UNREACHABLE };

      return { status: VerifyCredentialsStatusEnum.INCONCLUSIVE };
    }
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Resolves with `fallback` if `promise` hasn't settled within `ms`. The slow call is left to finish on its own. */
async function withDeadline<T, F>(promise: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  let timer: NodeJS.Timeout | undefined;
  const deadline = new Promise<F>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });

  try {
    return await Promise.race([promise, deadline]);
  } finally {
    clearTimeout(timer);
  }
}
