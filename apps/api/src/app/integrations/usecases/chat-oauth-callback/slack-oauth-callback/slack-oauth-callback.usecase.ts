import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  decryptCredentials,
  GetNovuProviderCredentials,
  GetNovuProviderCredentialsCommand,
} from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  ChannelTypeEnum,
  ContextRepository,
  EnvironmentRepository,
  ICredentialsEntity,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios from 'axios';
import { CreateChannelConnectionCommand } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.command';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { UpdateChannelConnectionCommand } from '../../../../channel-connections/usecases/update-channel-connection/update-channel-connection.command';
import { UpdateChannelConnection } from '../../../../channel-connections/usecases/update-channel-connection/update-channel-connection.usecase';
import { CreateChannelEndpointCommand } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { renderConnectionResultPage } from '../../../../shared/html/connection-result-page';
import { peekOAuthStatePayload } from '../../generate-chat-oath-url/chat-oauth-state.util';
import {
  GenerateSlackOauthUrl,
  StateData,
} from '../../generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';
import { ChatOauthCallbackResult, ResponseTypeEnum } from '../chat-oauth-callback.response';
import { SlackOauthCallbackCommand } from './slack-oauth-callback.command';

@Injectable()
export class SlackOauthCallback {
  private readonly SLACK_ACCESS_URL = 'https://slack.com/api/oauth.v2.access';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private getNovuProviderCredentials: GetNovuProviderCredentials,
    private channelConnectionRepository: ChannelConnectionRepository,
    private contextRepository: ContextRepository,
    private createChannelConnection: CreateChannelConnection,
    private updateChannelConnection: UpdateChannelConnection,
    private createChannelEndpoint: CreateChannelEndpoint
  ) {}

  async execute(command: SlackOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const stateData = await this.decodeSlackState(command.state);
    const integration = await this.getIntegration(stateData);
    const credentials = await this.getIntegrationCredentials(integration);

    const authData = await this.exchangeCodeForAuthData(command.providerCode, credentials);

    if (stateData.mode === 'link_user') {
      await this.linkUserEndpoint(stateData, integration, authData);
    } else if (authData.incoming_webhook) {
      /*
       * Incoming webhooks are handled differently from workspace connections:
       *
       * - Incoming webhook: Creates a stateless endpoint tied to a specific subscriber
       *   using only the webhook URL. This provides direct message delivery.
       *
       * - Workspace connection: Uses access_token for broader workspace access
       *   and is not tied to a specific subscriber.
       *
       * While authData contains both access_token and channel_id, we intentionally
       * use only the webhook URL to maintain clear separation of concerns.
       */
      await this.createIncomingWebhookEndpoint(stateData, integration, authData);
    } else {
      const connection = await this.upsertWorkspaceConnection(stateData, integration, authData);
      if (stateData.autoLinkUser === true && stateData.subscriberId && authData.authed_user?.id) {
        await this.createChannelEndpoint.execute(
          CreateChannelEndpointCommand.create({
            organizationId: stateData.organizationId,
            environmentId: stateData.environmentId,
            integrationIdentifier: integration.identifier,
            connectionIdentifier: connection.identifier,
            subscriberId: stateData.subscriberId,
            context: stateData.context,
            type: ENDPOINT_TYPES.SLACK_USER,
            endpoint: { userId: authData.authed_user.id },
          })
        );
      }
    }

    if (credentials.redirectUrl) {
      return { type: ResponseTypeEnum.URL, result: credentials.redirectUrl };
    }

    return {
      type: ResponseTypeEnum.HTML,
      result: renderConnectionResultPage({
        status: 'success',
        title: 'Connection complete',
        heading: "You're all set",
        message: 'Your Slack workspace is connected and ready to use.',
      }),
    };
  }

  private async upsertWorkspaceConnection(
    stateData: StateData,
    integration: IntegrationEntity,
    authData: { access_token: string; team: { id: string; name: string } }
  ): Promise<ChannelConnectionEntity> {
    const isSharedMode = stateData.connectionMode === 'shared';
    const subscriberId = isSharedMode ? undefined : stateData.subscriberId;
    const existingConnection = await this.findExistingConnection(stateData, integration, subscriberId);
    const auth = { accessToken: authData.access_token };
    const workspace = { id: authData.team.id, name: authData.team.name };

    if (existingConnection) {
      return await this.updateChannelConnection.execute(
        UpdateChannelConnectionCommand.create({
          identifier: existingConnection.identifier,
          organizationId: stateData.organizationId,
          environmentId: stateData.environmentId,
          auth,
          workspace,
        })
      );
    }

    return await this.createChannelConnection.execute(
      CreateChannelConnectionCommand.create({
        identifier: stateData.identifier,
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        subscriberId,
        context: stateData.context,
        connectionMode: stateData.connectionMode,
        auth,
        workspace,
      })
    );
  }

  private async resolveContextKeys(stateData: StateData): Promise<string[]> {
    if (!stateData.context) {
      return [];
    }

    const contexts = await this.contextRepository.findOrCreateContextsFromPayload(
      stateData.environmentId,
      stateData.organizationId,
      stateData.context
    );

    return contexts.map((context) => context.key);
  }

  private async findExistingConnection(
    stateData: StateData,
    integration: IntegrationEntity,
    subscriberId: string | undefined
  ): Promise<ChannelConnectionEntity | null> {
    if (stateData.identifier) {
      const connectionByIdentifier = await this.channelConnectionRepository.findOne({
        identifier: stateData.identifier,
        _organizationId: stateData.organizationId,
        _environmentId: stateData.environmentId,
      });

      if (connectionByIdentifier) {
        return connectionByIdentifier;
      }
    }

    const contextKeys = await this.resolveContextKeys(stateData);
    const contextQuery = this.channelConnectionRepository.buildContextExactMatchQuery(contextKeys);

    return await this.channelConnectionRepository.findOne({
      _organizationId: stateData.organizationId,
      _environmentId: stateData.environmentId,
      integrationIdentifier: integration.identifier,
      subscriberId,
      ...contextQuery,
    });
  }

  private async linkUserEndpoint(stateData: StateData, integration: IntegrationEntity, authData: any): Promise<void> {
    if (!stateData.subscriberId) {
      throw new BadRequestException('subscriberId is required for link_user mode');
    }

    const userId = authData.authed_user?.id;

    if (!userId) {
      throw new BadRequestException('Slack did not return a user ID in the OAuth response');
    }

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        connectionIdentifier: stateData.identifier,
        subscriberId: stateData.subscriberId,
        context: stateData.context,
        type: ENDPOINT_TYPES.SLACK_USER,
        endpoint: { userId },
      })
    );
  }

  private async createIncomingWebhookEndpoint(
    stateData: StateData,
    integration: IntegrationEntity,
    authData: any
  ): Promise<void> {
    if (!stateData.subscriberId) {
      throw new BadRequestException('subscriberId is required for incoming webhook');
    }

    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        context: stateData.context,
        integrationIdentifier: integration.identifier,
        subscriberId: stateData.subscriberId,
        type: ENDPOINT_TYPES.WEBHOOK,
        endpoint: {
          url: authData.incoming_webhook.url,
        },
      })
    );
  }

  private async getIntegration(stateData: StateData): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
      channel: ChannelTypeEnum.CHAT,
      providerId: { $in: [ChatProviderIdEnum.Slack, ChatProviderIdEnum.Novu] },
      identifier: stateData.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(
        `Slack integration not found: ${stateData.integrationIdentifier} in environment ${stateData.environmentId}`
      );
    }

    return integration;
  }

  private async getIntegrationCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    if (integration.providerId === ChatProviderIdEnum.Novu) {
      return this.getDemoNovuSlackCredentials(integration);
    }

    if (!integration.credentials) {
      throw new NotFoundException(`Slack integration missing credentials `);
    }

    if (!integration.credentials.clientId || !integration.credentials.secretKey) {
      throw new NotFoundException(`Slack integration missing required OAuth credentials (clientId/clientSecret) `);
    }

    return integration.credentials;
  }

  private async getDemoNovuSlackCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    return await this.getNovuProviderCredentials.execute(
      GetNovuProviderCredentialsCommand.create({
        channelType: integration.channel ?? ChannelTypeEnum.CHAT,
        providerId: integration.providerId,
        environmentId: integration._environmentId,
        organizationId: integration._organizationId,
        userId: 'system',
      })
    );
  }

  private async exchangeCodeForAuthData(providerCode: string, integrationCredentials: ICredentialsEntity) {
    const credentials = decryptCredentials(integrationCredentials);

    const body = {
      redirect_uri: GenerateSlackOauthUrl.buildRedirectUri(),
      code: providerCode,
      client_id: credentials.clientId,
      client_secret: credentials.secretKey,
    };

    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    };

    const res = await axios.post(this.SLACK_ACCESS_URL, body, config);

    if (res?.data?.ok === false) {
      const metaData = res?.data?.response_metadata?.messages?.join(', ');

      throw new BadRequestException(`Slack OAuth error: ${res.data.error}${metaData ? `, metadata: ${metaData}` : ''}`);
    }

    return res.data;
  }

  private async decodeSlackState(state: string): Promise<StateData> {
    try {
      const preliminaryData = peekOAuthStatePayload<Partial<StateData>>(state);

      if (!preliminaryData.environmentId) {
        throw new BadRequestException('Invalid Slack state: missing environmentId');
      }

      const environment = await this.environmentRepository.findOne({
        _id: preliminaryData.environmentId,
        _organizationId: preliminaryData.organizationId,
      });

      if (!environment) {
        throw new NotFoundException(`Environment not found: ${preliminaryData.environmentId}`);
      }

      if (!environment.apiKeys?.length) {
        throw new NotFoundException(`Environment ${preliminaryData.environmentId} has no API keys`);
      }

      const environmentApiKey = environment.apiKeys[0].key;

      return await GenerateSlackOauthUrl.validateAndDecodeState(state, environmentApiKey);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired Slack OAuth state parameter');
    }
  }
}
