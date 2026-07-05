import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  decryptCredentials,
} from '@novu/application-generic';
import {
  ChannelTypeEnum,
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ENDPOINT_TYPES, ICredentialsDto } from '@novu/shared';
import axios from 'axios';
import { CreateChannelEndpointCommand } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import {
  assertSubscriberChatOAuthStateMatchesRoute,
  decodeSubscriberChatOAuthState,
  SubscriberChatOAuthState,
} from '../chat-oauth/subscriber-chat-oauth-state.util';
import { ChatOauthCallbackCommand } from './chat-oauth-callback.command';
import { ChatOauthCallbackResult, ResponseTypeEnum } from './chat-oauth-callback.result';

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
    private createChannelEndpoint: CreateChannelEndpoint
  ) {}

  async execute(command: ChatOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const stateData = await this.decodeState(command);

    const integration = await this.getIntegration(stateData);
    const integrationCredentials = integration.credentials;
    const environment = await this.getEnvironment(stateData.environmentId);

    const webhookUrl = await this.getWebhook(stateData, command.providerCode, integrationCredentials);

    await this.createSubscriber(environment._organizationId, stateData, webhookUrl, integration);

    if (integrationCredentials?.redirectUrl) {
      return { typeOfResponse: ResponseTypeEnum.URL, resultString: integrationCredentials.redirectUrl };
    }

    return { typeOfResponse: ResponseTypeEnum.HTML, resultString: this.SCRIPT_CLOSE_TAB };
  }

  private async decodeState(command: ChatOauthCallbackCommand): Promise<SubscriberChatOAuthState> {
    try {
      const stateData = await decodeSubscriberChatOAuthState(command.state, this.environmentRepository);

      assertSubscriberChatOAuthStateMatchesRoute(stateData, {
        environmentId: command.environmentId,
        subscriberId: command.subscriberId,
        providerId: command.providerId,
        integrationIdentifier: command.integrationIdentifier,
      });

      return stateData;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Invalid or expired OAuth state parameter');
    }
  }

  private async createSubscriber(
    organizationId: string,
    stateData: SubscriberChatOAuthState,
    webhookUrl: string,
    integration: IntegrationEntity
  ): Promise<void> {
    await this.createSubscriberUsecase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId: stateData.environmentId,
        subscriberId: stateData.subscriberId,
      })
    );

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        subscriberId: stateData.subscriberId,
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
      throw new NotFoundException(`Environment ID: ${environmentId} not found`);
    }

    return environment;
  }

  private async getWebhook(
    stateData: SubscriberChatOAuthState,
    providerCode: string,
    integrationCredentials: ICredentialsDto
  ): Promise<string> {
    let redirectUri = `${
      process.env.API_ROOT_URL
    }/v1/subscribers/${stateData.subscriberId}/credentials/${stateData.providerId}/oauth/callback?environmentId=${stateData.environmentId}`;

    if (stateData.integrationIdentifier) {
      redirectUri = `${redirectUri}&integrationIdentifier=${stateData.integrationIdentifier}`;
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
        `Provider ${stateData.providerId} returned error ${res.data.error}${metaData ? `, metadata:${metaData}` : ''}`
      );
    }

    if (!webhook) {
      throw new BadRequestException(`Provider ${stateData.providerId} did not return a webhook url`);
    }

    return webhook;
  }

  private async getIntegration(stateData: SubscriberChatOAuthState) {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: stateData.environmentId,
      channel: ChannelTypeEnum.CHAT,
      providerId: stateData.providerId,
    };

    if (stateData.integrationIdentifier) {
      query.identifier = stateData.integrationIdentifier;
    }

    const integration = await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });

    if (integration == null) {
      throw new NotFoundException(
        `Integration in environment ${stateData.environmentId} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${stateData.providerId}`
      );
    }

    integration.credentials = decryptCredentials(integration.credentials);

    return integration;
  }
}
