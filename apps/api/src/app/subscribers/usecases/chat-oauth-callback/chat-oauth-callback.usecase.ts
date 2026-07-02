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
import { validateEncryption } from '../chat-oauth/chat-oauth.usecase';
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
    const integration = await this.getIntegration(command);
    const integrationCredentials = integration.credentials;

    const { _organizationId, apiKeys } = await this.getEnvironment(command.environmentId);

    await this.hmacValidation({
      credentialHmac: integrationCredentials.hmac,
      apiKey: apiKeys[0].key,
      subscriberId: command.subscriberId,
      externalHmacHash: command.hmacHash,
    });

    const webhookUrl = await this.getWebhook(command, integrationCredentials);

    await this.createSubscriber(_organizationId, command, webhookUrl, integration);

    if (integrationCredentials?.redirectUrl) {
      return { typeOfResponse: ResponseTypeEnum.URL, resultString: integrationCredentials.redirectUrl };
    }

    return { typeOfResponse: ResponseTypeEnum.HTML, resultString: this.SCRIPT_CLOSE_TAB };
  }

  private async createSubscriber(
    organizationId: string,
    command: ChatOauthCallbackCommand,
    webhookUrl: string,
    integration: IntegrationEntity
  ): Promise<void> {
    await this.createSubscriberUsecase.execute(
      CreateOrUpdateSubscriberCommand.create({
        organizationId,
        environmentId: command.environmentId,
        subscriberId: command?.subscriberId,
      })
    );

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: organizationId,
        environmentId: command.environmentId,
        integrationIdentifier: integration.identifier,
        subscriberId: command.subscriberId,
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
    command: ChatOauthCallbackCommand,
    integrationCredentials: ICredentialsDto
  ): Promise<string> {
    let redirectUri = `${
      process.env.API_ROOT_URL
    }/v1/subscribers/${command.subscriberId}/credentials/${command.providerId}/oauth/callback?environmentId=${command.environmentId}`;

    if (command.integrationIdentifier) {
      redirectUri = `${redirectUri}&integrationIdentifier=${command.integrationIdentifier}`;
    }

    const body = {
      redirect_uri: redirectUri,
      code: command.providerCode,
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
        `Provider ${command.providerId} returned error ${res.data.error}${metaData ? `, metadata:${metaData}` : ''}`
      );
    }

    if (!webhook) {
      throw new BadRequestException(`Provider ${command.providerId} did not return a webhook url`);
    }

    return webhook;
  }

  private async getIntegration(command: ChatOauthCallbackCommand) {
    const query: Partial<IntegrationEntity> & { _environmentId: string } = {
      _environmentId: command.environmentId,
      channel: ChannelTypeEnum.CHAT,
      providerId: command.providerId,
    };

    if (command.integrationIdentifier) {
      query.identifier = command.integrationIdentifier;
    }

    const integration = await this.integrationRepository.findOne(query, undefined, {
      query: { sort: { createdAt: -1 } },
    });

    if (integration == null) {
      throw new NotFoundException(
        `Integration in environment ${command.environmentId} was not found, channel: ${ChannelTypeEnum.CHAT}, ` +
          `providerId: ${command.providerId}`
      );
    }

    integration.credentials = decryptCredentials(integration.credentials);

    return integration;
  }

  private async hmacValidation({
    credentialHmac,
    apiKey,
    subscriberId,
    externalHmacHash,
  }: {
    credentialHmac: boolean | undefined;
    apiKey: string;
    subscriberId: string;
    externalHmacHash: string | undefined;
  }) {
    if (credentialHmac) {
      if (!externalHmacHash) {
        throw new BadRequestException(
          'Hmac is enabled on the integration, please provide a HMAC hash on the request params'
        );
      }

      validateEncryption({
        apiKey,
        subscriberId,
        externalHmacHash,
      });
    }
  }
}
