import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, PinoLogger } from '@novu/application-generic';
import {
  ChannelTypeEnum,
  EnvironmentRepository,
  ICredentialsEntity,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ChatProviderIdEnum, ENDPOINT_TYPES } from '@novu/shared';
import axios from 'axios';
import { CreateChannelConnectionCommand } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.command';
import { CreateChannelConnection } from '../../../../channel-connections/usecases/create-channel-connection/create-channel-connection.usecase';
import { CreateChannelEndpointCommand } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.command';
import { CreateChannelEndpoint } from '../../../../channel-endpoints/usecases/create-channel-endpoint/create-channel-endpoint.usecase';
import { peekOAuthStatePayload } from '../../generate-chat-oath-url/chat-oauth-state.util';
import { GenerateMsTeamsOauthUrlCommand } from '../../generate-chat-oath-url/generate-msteams-oath-url/generate-msteams-oauth-url.command';
import {
  GenerateMsTeamsOauthUrl,
  StateData,
} from '../../generate-chat-oath-url/generate-msteams-oath-url/generate-msteams-oauth-url.usecase';
import { ChatOauthCallbackResult, ResponseTypeEnum } from '../chat-oauth-callback.response';
import { MsTeamsOauthCallbackCommand } from './msteams-oauth-callback.command';

@Injectable()
export class MsTeamsOauthCallback {
  private readonly SCRIPT_CLOSE_TAB = '<script>window.close();</script>';
  private readonly MS_TEAMS_TOKEN_URL = 'https://login.microsoftonline.com';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private createChannelConnection: CreateChannelConnection,
    private createChannelEndpoint: CreateChannelEndpoint,
    private logger: PinoLogger,
    private generateMsTeamsOauthUrl: GenerateMsTeamsOauthUrl
  ) {
    this.logger.setContext(MsTeamsOauthCallback.name);
  }

  async execute(command: MsTeamsOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    this.logger.info(
      `MS Teams OAuth callback received: mode=${command.adminConsent ? 'admin_consent' : 'link_user'} tenant=${command.tenant ?? 'n/a'}`
    );

    const stateData = await this.decodeMsTeamsState(command.state);
    const integration = await this.getIntegration(stateData);
    const credentials = await this.getIntegrationCredentials(integration);

    if (stateData.mode === 'link_user') {
      await this.linkUserEndpoint(command, stateData, integration, credentials);
      this.logger.info(
        `MS Teams link_user completed successfully: subscriberId=${stateData.subscriberId} integrationId=${integration._id}`
      );
    } else {
      await this.createAdminConsentConnection(command, stateData, integration);
      this.logger.info(
        `MS Teams admin consent connection created: tenant=${command.tenant} integrationId=${integration._id} identifier=${stateData.identifier}`
      );

      /*
       * After admin consent, if autoLinkUser is explicitly true and a subscriberId is
       * present, chain into the link_user OAuth flow so the subscriber who clicked
       * "Connect" also gets their personal Teams identity linked in one go.
       *
       * autoLinkUser must be explicitly true — absent or false skips the chain.
       * The MsTeamsConnectButton SDK component defaults autoLinkUser to true so SDK
       * users get this behaviour by default; raw API callers must opt in explicitly.
       */
      if (stateData.autoLinkUser === true && stateData.subscriberId) {
        try {
          const linkUserUrl = await this.generateMsTeamsOauthUrl.execute(
            GenerateMsTeamsOauthUrlCommand.create({
              environmentId: stateData.environmentId,
              organizationId: stateData.organizationId,
              connectionIdentifier: stateData.identifier,
              subscriberId: stateData.subscriberId,
              integration,
              context: stateData.context,
              mode: 'link_user',
            })
          );

          return { type: ResponseTypeEnum.URL, result: linkUserUrl };
        } catch (error) {
          this.logger.warn(
            `Could not chain link_user redirect after admin consent: ${error instanceof Error ? error.message : String(error)}`
          );
        }
      }
    }

    if (credentials.redirectUrl) {
      return { type: ResponseTypeEnum.URL, result: credentials.redirectUrl };
    }

    return {
      type: ResponseTypeEnum.HTML,
      result: this.SCRIPT_CLOSE_TAB,
    };
  }

  private async createAdminConsentConnection(
    command: MsTeamsOauthCallbackCommand,
    stateData: StateData,
    integration: IntegrationEntity
  ): Promise<void> {
    if (!command.tenant) {
      throw new BadRequestException('Missing tenant parameter from MS Teams admin consent');
    }

    if (command.adminConsent !== 'True') {
      throw new BadRequestException('Admin consent was not granted');
    }

    /*
     * MS Teams app-only connection strategy:
     * - Admin grants consent once per subscriber tenant
     * - No code exchange, no tokens stored
     * - Store only the tenant ID
     * - When sending: use client_credentials to get fresh app-only tokens
     * - Messages sent as bot/app identity, not as user
     */
    await this.createChannelConnection.execute(
      CreateChannelConnectionCommand.create({
        identifier: stateData.identifier,
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        subscriberId: stateData.subscriberId,
        context: stateData.context,
        auth: { accessToken: 'app-only' },
        workspace: { id: command.tenant },
      })
    );
  }

  private async linkUserEndpoint(
    command: MsTeamsOauthCallbackCommand,
    stateData: StateData,
    integration: IntegrationEntity,
    credentials: ICredentialsEntity
  ): Promise<void> {
    if (!stateData.subscriberId) {
      throw new BadRequestException('subscriberId is required for link_user mode');
    }

    if (!command.providerCode) {
      throw new BadRequestException('Missing authorization code for link_user mode');
    }

    const decrypted = decryptCredentials(credentials);
    const oid = await this.exchangeCodeForAadObjectId(command.providerCode, decrypted);

    /*
     * We no longer call installBotForUser here. The user adds the bot to Teams themselves by
     * clicking the "Add in Teams" deep link shown in the setup guide (teams.microsoft.com/l/app/…).
     * When the user adds the app, Teams sends a conversationUpdate activity to the bot webhook
     * which establishes the conversation reference — the same outcome as the API install.
     * This removes the dependency on TeamsAppInstallation.ReadWriteSelfForUser.All, which can
     * take up to 5 hours to propagate after admin consent and blocked Quick Setup entirely.
     */
    await this.createChannelEndpoint.execute(
      CreateChannelEndpointCommand.create({
        organizationId: stateData.organizationId,
        environmentId: stateData.environmentId,
        integrationIdentifier: integration.identifier,
        connectionIdentifier: stateData.identifier,
        subscriberId: stateData.subscriberId,
        context: stateData.context,
        type: ENDPOINT_TYPES.MS_TEAMS_USER,
        endpoint: { userId: oid },
      })
    );
  }

  private async exchangeCodeForAadObjectId(code: string, credentials: ICredentialsEntity): Promise<string> {
    const { clientId, secretKey, tenantId } = credentials;

    if (!clientId || !secretKey || !tenantId) {
      throw new BadRequestException(
        'MS Teams integration missing required credentials (clientId, secretKey, tenantId)'
      );
    }

    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: secretKey,
      code,
      redirect_uri: GenerateMsTeamsOauthUrl.buildRedirectUri(),
      scope: 'openid profile User.Read',
    });

    const response = await axios.post(
      `${this.MS_TEAMS_TOKEN_URL}/${tenantId}/oauth2/v2.0/token`,
      tokenParams.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { id_token: idToken } = response.data;

    if (!idToken) {
      throw new BadRequestException('MS Teams OAuth response missing id_token');
    }

    const oid = this.extractOidFromIdToken(idToken);

    if (!oid) {
      throw new BadRequestException('MS Teams id_token missing oid claim — ensure the Azure app is single-tenant');
    }

    return oid;
  }

  private extractOidFromIdToken(idToken: string): string | undefined {
    try {
      const payload = idToken.split('.')[1];
      const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString('utf-8'));

      return decoded.oid as string | undefined;
    } catch {
      throw new BadRequestException('Failed to decode MS Teams id_token');
    }
  }

  private async getIntegration(stateData: StateData): Promise<IntegrationEntity> {
    const integration = await this.integrationRepository.findOne({
      _environmentId: stateData.environmentId,
      _organizationId: stateData.organizationId,
      channel: ChannelTypeEnum.CHAT,
      providerId: ChatProviderIdEnum.MsTeams,
      identifier: stateData.integrationIdentifier,
    });

    if (!integration) {
      throw new NotFoundException(
        `MS Teams integration not found: ${stateData.integrationIdentifier} in environment ${stateData.environmentId}`
      );
    }

    return integration;
  }

  private async getIntegrationCredentials(integration: IntegrationEntity): Promise<ICredentialsEntity> {
    if (!integration.credentials) {
      throw new NotFoundException('MS Teams integration missing credentials');
    }

    const { clientId, secretKey, tenantId } = integration.credentials;

    if (!clientId || !secretKey || !tenantId) {
      throw new NotFoundException('MS Teams integration missing required credentials (clientId, secretKey, tenantId)');
    }

    return integration.credentials;
  }

  private async decodeMsTeamsState(state: string): Promise<StateData> {
    try {
      const preliminaryData = peekOAuthStatePayload<Partial<StateData>>(state);

      if (!preliminaryData.environmentId) {
        throw new BadRequestException('Invalid MS Teams state: missing environmentId');
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

      return await GenerateMsTeamsOauthUrl.validateAndDecodeState(state, environmentApiKey);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Invalid or expired MS Teams OAuth state parameter');
    }
  }
}
