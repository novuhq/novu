import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  decryptCredentials,
  PinoLogger,
} from '@novu/application-generic';
import {
  ChannelTypeEnum,
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES, ICredentialsDto } from '@novu/shared';
import axios from 'axios';
import { CreateChannelEndpointCommand } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { CHAT_INTEGRATION_NOT_FOUND_MESSAGE, validateEncryption } from '../chat-oauth/chat-oauth.usecase';
import {
  getLegacyChatOauthMode,
  LEGACY_CHAT_OAUTH_MIGRATION_HINT,
  LegacyChatOauthMode,
} from '../chat-oauth/legacy-chat-oauth.config';
import {
  decodeLegacyChatOauthState,
  peekLegacyChatOauthStateEnvironmentId,
} from '../chat-oauth/legacy-chat-oauth-state';
import { ChatOauthCallbackCommand } from './chat-oauth-callback.command';
import { ChatOauthCallbackResult, ResponseTypeEnum } from './chat-oauth-callback.result';

/**
 * Routing fields the callback acts on. When the provider echoes back a `state`
 * minted by `ChatOauth`, they come from that signed payload; otherwise they fall
 * back to the query string, which is the pre-`state` behavior kept alive for
 * authorization URLs that were built by hand rather than by our own endpoint.
 */
type ResolvedCallbackRouting = {
  environmentId: string;
  subscriberId: string;
  providerId: ChatProviderIdEnum;
  integrationIdentifier?: string;
  hmacHash?: string;
  isStateVerified: boolean;
};

/**
 * @deprecated Use the new channel management approach.
 * @see channel-endpoints and channel-connections modules
 */
@Injectable()
export class ChatOauthCallback {
  readonly SLACK_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';
  readonly SCRIPT_CLOSE_TAB = '<script>window.close();</script>';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private createSubscriberUsecase: CreateOrUpdateSubscriberUseCase,
    private createChannelEndpoint: CreateChannelEndpoint,
    private logger: PinoLogger
  ) {
    this.logger.setContext(ChatOauthCallback.name);
  }

  async execute(command: ChatOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const mode = getLegacyChatOauthMode();

    if (mode === LegacyChatOauthMode.DISABLED) {
      throw new ForbiddenException(LEGACY_CHAT_OAUTH_MIGRATION_HINT);
    }

    const routing = await this.resolveRouting(command);
    const integration = await this.getIntegration(routing);
    const integrationCredentials = integration.credentials;

    const { _organizationId, apiKeys } = await this.getEnvironment(routing.environmentId);

    this.hmacValidation({
      isHmacRequired: integrationCredentials.hmac === true || mode === LegacyChatOauthMode.HMAC_REQUIRED,
      apiKey: apiKeys[0].key,
      routing,
    });

    const webhookUrl = await this.getWebhook(command.providerCode, routing, integrationCredentials);

    await this.createSubscriber(_organizationId, routing, webhookUrl, integration);

    if (integrationCredentials?.redirectUrl) {
      return { typeOfResponse: ResponseTypeEnum.URL, resultString: integrationCredentials.redirectUrl };
    }

    return { typeOfResponse: ResponseTypeEnum.HTML, resultString: this.SCRIPT_CLOSE_TAB };
  }

  /**
   * A signed `state` is the only thing that ties this callback to an OAuth URL
   * this API actually minted, so whatever it carries wins over the query string.
   */
  private async resolveRouting(command: ChatOauthCallbackCommand): Promise<ResolvedCallbackRouting> {
    if (!command.state) {
      this.logger.warn(
        {
          environmentId: command.environmentId,
          providerId: command.providerId,
          integrationIdentifier: command.integrationIdentifier,
        },
        `Legacy chat OAuth callback received without a signed state. ${LEGACY_CHAT_OAUTH_MIGRATION_HINT}`
      );

      return {
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        providerId: command.providerId,
        integrationIdentifier: command.integrationIdentifier,
        hmacHash: command.hmacHash,
        isStateVerified: false,
      };
    }

    const stateEnvironmentId = peekLegacyChatOauthStateEnvironmentId(command.state);
    const apiKey = await this.getEnvironmentApiKey(stateEnvironmentId);
    const state = decodeLegacyChatOauthState(command.state, apiKey);

    if (state.subscriberId !== command.subscriberId || state.providerId !== command.providerId) {
      throw new BadRequestException('OAuth state does not match the requested subscriber');
    }

    return {
      environmentId: state.environmentId,
      subscriberId: state.subscriberId,
      providerId: state.providerId,
      integrationIdentifier: state.integrationIdentifier,
      hmacHash: state.hmacHash,
      isStateVerified: true,
    };
  }

  private async createSubscriber(
    organizationId: string,
    routing: ResolvedCallbackRouting,
    webhookUrl: string,
    integration: IntegrationEntity
  ): Promise<void> {
    await this.createSubscriberUsecase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId: routing.environmentId,
        subscriberId: routing.subscriberId,
      })
    );

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: organizationId,
        environmentId: routing.environmentId,
        integrationIdentifier: integration.identifier,
        subscriberId: routing.subscriberId,
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: {
          url: webhookUrl,
        },
      })
    );
  }

  private async getEnvironment(environmentId: string): Promise<EnvironmentEntity> {
    const environment = await this.environmentRepository.findOne({ _id: environmentId });

    if (environment == null) {
      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    return environment;
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    return apiKeys[0].key;
  }

  private async getWebhook(
    providerCode: string,
    routing: ResolvedCallbackRouting,
    integrationCredentials: ICredentialsDto
  ): Promise<string> {
    let redirectUri = `${process.env.API_ROOT_URL}/v1/subscribers/${routing.subscriberId}/credentials/${
      routing.providerId
    }/oauth/callback?environmentId=${routing.environmentId}`;

    if (routing.integrationIdentifier) {
      redirectUri = `${redirectUri}&integrationIdentifier=${routing.integrationIdentifier}`;
    }

    const body = {
      redirect_uri: redirectUri,
      code: providerCode,
      client_id: integrationCredentials.clientId,
      client_secret: integrationCredentials.secretKey,
    };
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const res = await axios.post(this.SLACK_ACCESS_URL, body, config);
    const webhook = res.data?.incoming_webhook?.url;

    if (res?.data?.ok === false) {
      const metaData = res?.data?.response_metadata?.messages?.join(', ');
      throw new BadRequestException(
        `Provider ${routing.providerId} returned error ${res.data.error}${metaData ? `, metadata:${metaData}` : ''}`
      );
    }

    if (!webhook) {
      throw new BadRequestException(`Provider ${routing.providerId} did not return a webhook url`);
    }

    return webhook;
  }

  private async getIntegration(routing: ResolvedCallbackRouting): Promise<IntegrationEntity> {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: routing.environmentId,
      channel: ChannelTypeEnum.CHAT,
      providerId: routing.providerId,
    };

    if (routing.integrationIdentifier) {
      query.identifier = routing.integrationIdentifier;
    }

    const integration = await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });

    if (integration == null) {
      this.logger.warn(
        {
          environmentId: routing.environmentId,
          providerId: routing.providerId,
          integrationIdentifier: routing.integrationIdentifier,
        },
        'Legacy chat OAuth callback could not be resolved to an integration'
      );

      throw new NotFoundException(CHAT_INTEGRATION_NOT_FOUND_MESSAGE);
    }

    integration.credentials = decryptCredentials(integration.credentials);

    return integration;
  }

  private hmacValidation({
    isHmacRequired,
    apiKey,
    routing,
  }: {
    isHmacRequired: boolean;
    apiKey: string;
    routing: ResolvedCallbackRouting;
  }) {
    if (!isHmacRequired) {
      return;
    }

    if (!routing.hmacHash) {
      throw new BadRequestException(
        'Hmac is enabled on the integration, please provide a HMAC hash on the request params'
      );
    }

    validateEncryption({
      apiKey,
      subscriberId: routing.subscriberId,
      externalHmacHash: routing.hmacHash,
    });
  }
}
