import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { decryptCredentials, MsTeamsTokenService, PinoLogger } from '@novu/application-generic';
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

const MS_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

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
    private msTeamsTokenService: MsTeamsTokenService,
    private generateMsTeamsOauthUrl: GenerateMsTeamsOauthUrl
  ) {
    this.logger.setContext(MsTeamsOauthCallback.name);
  }

  async execute(command: MsTeamsOauthCallbackCommand): Promise<ChatOauthCallbackResult> {
    const stateData = await this.decodeMsTeamsState(command.state);
    const integration = await this.getIntegration(stateData);
    const credentials = await this.getIntegrationCredentials(integration);

    if (stateData.mode === 'link_user') {
      try {
        await this.linkUserEndpoint(command, stateData, integration, credentials);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'An unexpected error occurred during bot installation.';

        return {
          type: ResponseTypeEnum.HTML,
          result: this.buildErrorHtml(message),
        };
      }
    } else {
      await this.createAdminConsentConnection(command, stateData, integration);

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

    await this.installBotForUser(oid, decrypted);

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

  private async installBotForUser(oid: string, credentials: ICredentialsEntity): Promise<void> {
    const { clientId, secretKey, tenantId } = credentials;

    const graphToken = await this.msTeamsTokenService.getGraphToken(
      clientId as string,
      secretKey as string,
      tenantId as string
    );

    const teamsAppId = await this.resolveTeamsAppId(graphToken, clientId as string);

    await this.installAppForUser(graphToken, oid, teamsAppId);
  }

  private async resolveTeamsAppId(graphToken: string, azureClientId: string): Promise<string> {
    /*
     * We scope the query to distributionMethod eq 'organization' to avoid picking up sideloaded
     * copies of the same app. Filtering server-side guarantees a unique match: the org catalog
     * allows only one published entry per externalId, so the combination is effectively unique.
     *
     * Edge case — store apps: globally-published Teams store apps use distributionMethod='store'
     * and would be missed by this filter. That is intentional here: Novu customers supply their
     * own Azure bot (clientId + secretKey), which is always an org-published custom app. Store
     * apps use a different identity model. If store-app support is ever needed, expand the filter
     * to: distributionMethod eq 'organization' or distributionMethod eq 'store'.
     */
    const url = `${MS_GRAPH_BASE_URL}/appCatalogs/teamsApps?$filter=externalId eq '${azureClientId}' and distributionMethod eq 'organization'`;

    let response: { data: { value: Array<{ id: string }> } };

    try {
      response = await axios.get(url, {
        headers: { Authorization: `Bearer ${graphToken}` },
      });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 403) {
        throw new BadRequestException(
          'MS Teams bot installation failed: missing Azure permissions. ' +
            'Please grant AppCatalog.Read.All and TeamsAppInstallation.ReadWriteSelfForUser.All ' +
            'application permissions in Azure Portal and re-run admin consent.'
        );
      }

      throw new BadRequestException(
        `MS Teams bot installation failed while resolving Teams app ID: ${
          axios.isAxiosError(error) ? error.message : String(error)
        }`
      );
    }

    const apps = response.data.value;

    if (!apps || apps.length === 0) {
      throw new BadRequestException(
        'MS Teams bot installation failed: app not found in your organization catalog. ' +
          'Please upload the Teams app manifest to your organization catalog first.'
      );
    }

    if (apps.length > 1) {
      this.logger.warn(
        `Multiple org-published Teams apps found for clientId ${azureClientId} — using first match (id=${apps[0].id})`
      );
    }

    return apps[0].id;
  }

  private async installAppForUser(graphToken: string, userOid: string, teamsAppId: string): Promise<void> {
    const url = `${MS_GRAPH_BASE_URL}/users/${userOid}/teamwork/installedApps`;
    const body = {
      'teamsApp@odata.bind': `${MS_GRAPH_BASE_URL}/appCatalogs/teamsApps/${teamsAppId}`,
    };

    try {
      await axios.post(url, body, {
        headers: {
          Authorization: `Bearer ${graphToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;

        if (status === 409) {
          return;
        }

        if (status === 403) {
          throw new BadRequestException(
            'MS Teams bot installation failed: missing Azure permissions. ' +
              'Please grant TeamsAppInstallation.ReadWriteSelfForUser.All ' +
              'application permission in Azure Portal and re-run admin consent.'
          );
        }

        if (status === 404) {
          throw new BadRequestException(
            'MS Teams bot installation failed: user or app not found. ' +
              'Ensure the app is published to your organization catalog and the user exists in the tenant.'
          );
        }
      }

      throw new BadRequestException(
        `MS Teams bot installation failed: ${axios.isAxiosError(error) ? error.message : String(error)}`
      );
    }
  }

  private buildErrorHtml(message: string): string {
    const escaped = message
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>MS Teams Setup Error</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 2rem; color: #1a1a1a; }
    .error-box { background: #fff3f3; border: 1px solid #f5c6c6; border-radius: 8px; padding: 1.5rem; max-width: 560px; }
    h2 { margin: 0 0 0.75rem; color: #c0392b; font-size: 1.1rem; }
    p { margin: 0; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="error-box">
    <h2>MS Teams Bot Installation Failed</h2>
    <p>${escaped}</p>
  </div>
</body>
</html>`;
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
