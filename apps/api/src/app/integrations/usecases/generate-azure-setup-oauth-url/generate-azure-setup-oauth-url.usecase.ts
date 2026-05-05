import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { createHash } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { encodeOAuthState } from '../generate-chat-oath-url/chat-oauth-state.util';
import { GenerateAzureSetupOauthUrlCommand } from './generate-azure-setup-oauth-url.command';

/**
 * Azure AD OAuth scopes for Novu to create an App Registration on behalf of the user.
 *
 * Application.ReadWrite.All is required because Application.ReadWrite.OwnedBy does not
 * exist as a delegated permission — it is application-only. The delegated equivalent for
 * creating app registrations via Graph is Application.ReadWrite.All, which requires
 * admin consent on the customer's tenant.
 */
export const AZURE_SETUP_OAUTH_SCOPES = [
  'openid',
  'profile',
  'offline_access',
  'https://graph.microsoft.com/Application.ReadWrite.All',
  'https://graph.microsoft.com/AppRoleAssignment.ReadWrite.All',
  'https://graph.microsoft.com/AppCatalog.ReadWrite.All',
  'https://management.azure.com/user_impersonation',
] as const;

export type AzureSetupStateData = {
  integrationId: string;
  environmentId: string;
  organizationId: string;
  userId: string;
  timestamp: number;
};

@Injectable()
export class GenerateAzureSetupOauthUrl {
  private readonly AZURE_AUTHORIZE_URL = 'https://login.microsoftonline.com/organizations/oauth2/v2.0/authorize';

  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: GenerateAzureSetupOauthUrlCommand): Promise<string> {
    const integration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: command.organizationId,
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.MsTeams) {
      throw new UnauthorizedException('Azure setup OAuth is only supported for MS Teams integrations');
    }

    const signingKey = await this.getEnvironmentApiKey(command.environmentId);

    const stateData: AzureSetupStateData = {
      integrationId: command.integrationId,
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      userId: command.userId,
      timestamp: Date.now(),
    };

    const payload = JSON.stringify(stateData);
    const signature = createHash(signingKey, payload);

    if (!signature) {
      throw new Error('Failed to create OAuth state signature');
    }

    const secureState = encodeOAuthState(payload, signature);

    const params = new URLSearchParams({
      client_id: this.getNovuAzureClientId(),
      response_type: 'code',
      redirect_uri: GenerateAzureSetupOauthUrl.buildRedirectUri(),
      scope: AZURE_SETUP_OAUTH_SCOPES.join(' '),
      state: secureState,
      response_mode: 'query',
      prompt: 'consent',
    });

    return `${this.AZURE_AUTHORIZE_URL}?${params.toString()}`;
  }

  static buildRedirectUri(): string {
    if (!process.env.API_ROOT_URL) {
      throw new Error('API_ROOT_URL environment variable is required');
    }

    const base = process.env.API_ROOT_URL.replace(/\/$/, '');

    return `${base}/v1/integrations/chat/oauth/azure-setup/callback`;
  }

  private getNovuAzureClientId(): string {
    const clientId = process.env.NOVU_AZURE_CLIENT_ID;

    if (!clientId) {
      throw new NotFoundException(
        'Azure Quick Setup is not configured on this Novu instance (NOVU_AZURE_CLIENT_ID missing)'
      );
    }

    return clientId;
  }

  private async getEnvironmentApiKey(environmentId: string): Promise<string> {
    const apiKeys = await this.environmentRepository.getApiKeys(environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment ${environmentId} not found`);
    }

    return apiKeys[0].key;
  }
}
