import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { PinoLogger } from '../logging';
import { CachedResponse } from './cache/interceptors/cached-response.decorator';

const MS_AAD_TOKEN_URL = 'https://login.microsoftonline.com';
const BOT_FRAMEWORK_SCOPE = 'https://api.botframework.com/.default';
const GRAPH_SCOPE = 'https://graph.microsoft.com/.default';
const TOKEN_TTL_SECONDS = 3300; // 55 minutes (1-hour token minus 5-minute buffer)

@Injectable()
export class MsTeamsTokenService {
  constructor(private logger: PinoLogger) {
    this.logger.setContext(MsTeamsTokenService.name);
  }

  /**
   * Acquires an app-only Microsoft Graph token using the client credentials flow.
   * Required permissions: AppCatalog.Read.All, TeamsAppInstallation.ReadWriteSelfForUser.All
   * Cache key: msteams:graph-token:{clientId}:{appTenantId}, TTL 55 minutes.
   */
  @CachedResponse<string>({
    builder: (clientId: string, _secretKey: string, appTenantId: string) =>
      `msteams:graph-token:${clientId}:${appTenantId}`,
    options: {
      ttl: TOKEN_TTL_SECONDS,
      skipSaveToCache: (token: string) => token === '',
    },
  })
  async getGraphToken(clientId: string, secretKey: string, appTenantId: string): Promise<string> {
    return this.fetchClientCredentialsToken(clientId, secretKey, appTenantId, GRAPH_SCOPE);
  }

  /**
   * Acquires a Bot Framework token using the client credentials flow.
   * Migrated from ResolveChannelEndpoints.getMsTeamsBotToken.
   * Cache key: msteams:bot-token:{clientId}:{appTenantId}, TTL 55 minutes.
   * Returns empty string on failure to allow graceful degradation in the send path.
   */
  @CachedResponse<string>({
    builder: (clientId: string, _secretKey: string, appTenantId: string) =>
      `msteams:bot-token:${clientId}:${appTenantId}`,
    options: {
      ttl: TOKEN_TTL_SECONDS,
      skipSaveToCache: (token: string) => token === '',
    },
  })
  async getBotFrameworkToken(clientId: string, secretKey: string, appTenantId: string): Promise<string> {
    try {
      return await this.fetchClientCredentialsToken(clientId, secretKey, appTenantId, BOT_FRAMEWORK_SCOPE);
    } catch (error) {
      const errorMessage =
        axios.isAxiosError(error) && error.response
          ? `Failed to fetch MS Teams bot token: ${error.response.status} - ${JSON.stringify(error.response.data)}`
          : `Failed to fetch MS Teams bot token: ${(error as Error).message || error}`;

      this.logger.error(errorMessage, (error as Error).stack);

      return '';
    }
  }

  private async fetchClientCredentialsToken(
    clientId: string,
    secretKey: string,
    appTenantId: string,
    scope: string
  ): Promise<string> {
    const tokenUrl = `${MS_AAD_TOKEN_URL}/${appTenantId}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: secretKey,
      scope,
    });

    const response = await axios.post<{ access_token: string; expires_in: number }>(tokenUrl, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data.access_token;
  }
}
