import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { buildZip, createHash, encryptCredentials, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import axios, { AxiosError } from 'axios';
import {
  AZURE_SETUP_OAUTH_SCOPES,
  AzureSetupStateData,
  GenerateAzureSetupOauthUrl,
} from '../generate-azure-setup-oauth-url/generate-azure-setup-oauth-url.usecase';
import { splitOAuthState } from '../generate-chat-oath-url/chat-oauth-state.util';
import { AzureSetupOauthCallbackCommand } from './azure-setup-oauth-callback.command';

const MS_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
const MS_LOGIN_BASE_URL = 'https://login.microsoftonline.com';
const MS_ARM_BASE_URL = 'https://management.azure.com';
const MS_ARM_API_VERSION = '2022-09-01';
const MS_BOT_SERVICE_API_VERSION = '2023-09-15-preview';

/**
 * Graph permissions required on the customer's bot app registration.
 * These match what the MS Teams integration manual setup documents.
 */
const REQUIRED_GRAPH_PERMISSIONS = [
  { id: '7ab1d382-f21e-4acd-a863-ba3e13f7da61', type: 'Role' }, // Directory.Read.All
  { id: '2280dda6-0bfd-44ee-a2f4-cb867cfc4c1e', type: 'Role' }, // Team.ReadBasic.All
  { id: '59a6b24b-4225-4393-8165-ebaec5f55d7a', type: 'Role' }, // Channel.ReadBasic.All
  { id: 'e12dae10-5a57-4817-b79d-dfbec5348930', type: 'Role' }, // AppCatalog.Read.All
  { id: '9f67436c-5415-4e7f-8ac1-3014a7132630', type: 'Role' }, // TeamsAppInstallation.ReadWriteSelfForTeam.All
  { id: '908de74d-f8b2-4d6b-a9ed-2a17b3b78179', type: 'Role' }, // TeamsAppInstallation.ReadWriteSelfForUser.All
];

/** Graph resource ID for Microsoft Graph (constant) */
const GRAPH_RESOURCE_APP_ID = '00000003-0000-0000-c000-000000000000';

export type AzureSetupResult = {
  /** Script response for the browser popup. Posts a message to the opener and closes the tab. */
  html: string;
};

type TokenResponse = {
  accessToken: string;
  refreshToken: string | null;
};

@Injectable()
export class AzureSetupOauthCallback {
  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private agentIntegrationRepository: AgentIntegrationRepository,
    private logger: PinoLogger
  ) {
    this.logger.setContext(AzureSetupOauthCallback.name);
  }

  async execute(command: AzureSetupOauthCallbackCommand): Promise<AzureSetupResult> {
    if (command.error) {
      this.logger.error(
        `Azure OAuth callback returned an error: error=${command.error} description=${command.errorDescription ?? 'n/a'}`
      );
      throw new BadRequestException(
        `Azure OAuth error: ${command.error}${command.errorDescription ? ` — ${command.errorDescription}` : ''}`
      );
    }

    if (!command.code) {
      throw new BadRequestException('Missing authorization code from Azure OAuth callback');
    }

    const stateData = await this.decodeAndVerifyState(command.state);

    this.logger.info(
      `Azure setup OAuth callback: creating app registration for integrationId=${stateData.integrationId} organizationId=${stateData.organizationId}`
    );

    const { accessToken, refreshToken } = await this.exchangeCodeForToken(command.code);

    const { appId, secretValue, tenantId } = await this.createAppRegistration(accessToken, stateData);

    this.logger.info(
      `Azure setup: app registration created appId=${appId} tenantId=${tenantId} integrationId=${stateData.integrationId}`
    );

    await this.saveCredentials(stateData, appId, secretValue, tenantId);

    this.logger.info(`Azure setup: credentials saved for integrationId=${stateData.integrationId}`);

    await this.tryUploadTeamsApp(accessToken, appId, stateData);

    // Fire-and-forget: deploy the Bot Service via ARM (health-check polling catches readiness)
    if (refreshToken) {
      void this.tryDeployBotService(refreshToken, appId, tenantId, stateData).catch((err) => {
        this.logger.warn(
          `Azure setup: ARM deployment failed (non-fatal, health check will reflect) integrationId=${stateData.integrationId} error="${this.axiosErrorMessage(err)}" responseBody=${JSON.stringify((err as AxiosError)?.response?.data ?? null)}`
        );
      });
    } else {
      this.logger.warn(
        `Azure setup: no refresh token available, skipping ARM deployment integrationId=${stateData.integrationId}`
      );
      void this.writeProvisioning(stateData, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        errorMessage: 'No refresh token available — ARM deployment was skipped.',
      });
    }

    return { html: AzureSetupOauthCallback.buildPopupHtml({ success: true }) };
  }

  static buildPopupHtml(_options: { success: boolean; errorMessage?: string }): string {
    return `<!DOCTYPE html><html><body><script>window.close();\x3c/script></body></html>`;
  }

  private async decodeAndVerifyState(state: string): Promise<AzureSetupStateData> {
    let preliminaryData: Partial<AzureSetupStateData>;

    try {
      const { payload } = splitOAuthState(state);
      preliminaryData = JSON.parse(payload);
    } catch {
      throw new BadRequestException('Invalid Azure setup OAuth state');
    }

    if (!preliminaryData.environmentId || !preliminaryData.organizationId) {
      throw new BadRequestException('Azure setup state missing required fields');
    }

    const environment = await this.environmentRepository.findOne({
      _id: preliminaryData.environmentId,
      _organizationId: preliminaryData.organizationId,
    });

    if (!environment?.apiKeys?.length) {
      throw new NotFoundException(`Environment ${preliminaryData.environmentId} not found`);
    }

    const signingKey = environment.apiKeys[0].key;

    try {
      const { payload, signature } = splitOAuthState(state);
      const expectedSignature = createHash(signingKey, payload);

      if (signature !== expectedSignature) {
        throw new Error('Signature mismatch');
      }

      const data = JSON.parse(payload) as AzureSetupStateData;

      const FIFTEEN_MINUTES = 15 * 60 * 1000;

      if (Date.now() - data.timestamp > FIFTEEN_MINUTES) {
        throw new Error('State expired');
      }

      return data;
    } catch {
      throw new BadRequestException('Invalid or expired Azure setup OAuth state');
    }
  }

  private async exchangeCodeForToken(code: string): Promise<TokenResponse> {
    const clientId = process.env.NOVU_AZURE_CLIENT_ID;
    const clientSecret = process.env.NOVU_AZURE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new NotFoundException('Azure Quick Setup is not configured on this Novu instance');
    }

    const graphScopes = AZURE_SETUP_OAUTH_SCOPES.filter((s) => s.startsWith('https://graph.microsoft.com/')).join(' ');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: GenerateAzureSetupOauthUrl.buildRedirectUri(),
      scope: graphScopes,
    });

    try {
      const response = await axios.post<{ access_token: string; refresh_token?: string }>(
        `${MS_LOGIN_BASE_URL}/organizations/oauth2/v2.0/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      return {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token ?? null,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to exchange authorization code: ${this.axiosErrorMessage(error)}`);
    }
  }

  /**
   * Exchanges a refresh token for an Azure Management API access token.
   * The refresh token is obtained from the initial Graph token exchange (offline_access scope).
   * Microsoft issues tokens per-resource, so a separate exchange is needed for management.azure.com.
   */
  private async exchangeRefreshTokenForManagementToken(refreshToken: string): Promise<string> {
    const clientId = process.env.NOVU_AZURE_CLIENT_ID;
    const clientSecret = process.env.NOVU_AZURE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Azure credentials not configured');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      scope: 'https://management.azure.com/.default offline_access',
    });

    const response = await axios.post<{ access_token: string }>(
      `${MS_LOGIN_BASE_URL}/organizations/oauth2/v2.0/token`,
      params.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    return response.data.access_token;
  }

  private async createAppRegistration(
    accessToken: string,
    stateData: AzureSetupStateData
  ): Promise<{ appId: string; secretValue: string; tenantId: string }> {
    const integration = await this.integrationRepository.findOne({
      _id: stateData.integrationId,
      _organizationId: stateData.organizationId,
    });

    const appName = integration?.name ?? 'Novu Bot';

    const appBody = {
      displayName: appName,
      signInAudience: 'AzureADMyOrg',
      requiredResourceAccess: [
        {
          resourceAppId: GRAPH_RESOURCE_APP_ID,
          resourceAccess: REQUIRED_GRAPH_PERMISSIONS,
        },
      ],
      web: {
        redirectUris: [GenerateAzureSetupOauthUrl.buildRedirectUri().replace('/azure-setup/callback', '/callback')],
      },
    };

    let appObjectId: string;
    let appId: string;

    try {
      const appResponse = await axios.post<{ id: string; appId: string }>(
        `${MS_GRAPH_BASE_URL}/applications`,
        appBody,
        { headers: this.graphHeaders(accessToken) }
      );

      appObjectId = appResponse.data.id;
      appId = appResponse.data.appId;
    } catch (error) {
      throw new BadRequestException(`Failed to create App Registration: ${this.axiosErrorMessage(error)}`);
    }

    // Create service principal so the app appears in the tenant's app list
    let tenantId: string;
    let botServicePrincipalId: string | undefined;

    try {
      const spResponse = await axios.post<{ id: string; appOwnerOrganizationId: string }>(
        `${MS_GRAPH_BASE_URL}/servicePrincipals`,
        { appId },
        { headers: this.graphHeaders(accessToken) }
      );

      botServicePrincipalId = spResponse.data.id;
      tenantId = spResponse.data.appOwnerOrganizationId;
    } catch (error) {
      this.logger.warn(`Could not create service principal: ${this.axiosErrorMessage(error)}`);
      // Attempt to retrieve tenantId via /organization as fallback
      tenantId = await this.getTenantId(accessToken);
    }

    // Grant admin consent for all required Graph app roles so they appear as "Granted" in the portal
    if (botServicePrincipalId) {
      await this.grantAdminConsent(accessToken, botServicePrincipalId);
    }

    // Create client secret
    let secretValue: string;

    try {
      const secretResponse = await axios.post<{ secretText: string }>(
        `${MS_GRAPH_BASE_URL}/applications/${appObjectId}/addPassword`,
        {
          passwordCredential: {
            displayName: 'Novu Bot Secret',
            endDateTime: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString(), // 2 years
          },
        },
        { headers: this.graphHeaders(accessToken) }
      );

      secretValue = secretResponse.data.secretText;
    } catch (error) {
      throw new BadRequestException(`Failed to create client secret: ${this.axiosErrorMessage(error)}`);
    }

    return { appId, secretValue, tenantId };
  }

  /**
   * Grants admin consent for all REQUIRED_GRAPH_PERMISSIONS by creating appRoleAssignments
   * on the bot's service principal. Without this step the permissions are declared but remain
   * in the "Not granted" state in the Azure portal.
   *
   * Requires the AppRoleAssignment.ReadWrite.All scope, which is already included in
   * AZURE_SETUP_OAUTH_SCOPES so the delegated access token has the necessary privilege.
   */
  private async grantAdminConsent(accessToken: string, botServicePrincipalId: string): Promise<void> {
    // Resolve the Microsoft Graph service principal id in the customer's tenant
    let graphServicePrincipalId: string;

    try {
      const graphSpResponse = await axios.get<{ value: Array<{ id: string }> }>(
        `${MS_GRAPH_BASE_URL}/servicePrincipals?$filter=appId eq '${GRAPH_RESOURCE_APP_ID}'`,
        { headers: this.graphHeaders(accessToken) }
      );

      const graphSp = graphSpResponse.data.value[0];

      if (!graphSp) {
        this.logger.warn('Could not find Microsoft Graph service principal in tenant — skipping admin consent grant');

        return;
      }

      graphServicePrincipalId = graphSp.id;
    } catch (error) {
      this.logger.warn(`Failed to look up Microsoft Graph service principal: ${this.axiosErrorMessage(error)}`);

      return;
    }

    // Assign each required app role — failures are non-fatal (e.g. already assigned)
    for (const perm of REQUIRED_GRAPH_PERMISSIONS) {
      try {
        await axios.post(
          `${MS_GRAPH_BASE_URL}/servicePrincipals/${botServicePrincipalId}/appRoleAssignments`,
          {
            principalId: botServicePrincipalId,
            resourceId: graphServicePrincipalId,
            appRoleId: perm.id,
          },
          { headers: this.graphHeaders(accessToken) }
        );
      } catch (error) {
        this.logger.warn(`Failed to grant app role ${perm.id} (non-fatal): ${this.axiosErrorMessage(error)}`);
      }
    }

    this.logger.info(
      `Admin consent granted for ${REQUIRED_GRAPH_PERMISSIONS.length} Graph permissions on servicePrincipal=${botServicePrincipalId}`
    );
  }

  private async getTenantId(accessToken: string): Promise<string> {
    try {
      const response = await axios.get<{ value: Array<{ id: string }> }>(`${MS_GRAPH_BASE_URL}/organization`, {
        headers: this.graphHeaders(accessToken),
      });

      return response.data.value[0]?.id ?? '';
    } catch {
      return '';
    }
  }

  private async saveCredentials(
    stateData: AzureSetupStateData,
    appId: string,
    secretValue: string,
    tenantId: string
  ): Promise<void> {
    const credentials = encryptCredentials({
      clientId: appId,
      secretKey: secretValue,
      tenantId,
    });

    await this.integrationRepository.update(
      {
        _id: stateData.integrationId,
        _organizationId: stateData.organizationId,
      },
      { $set: { credentials } }
    );
  }

  // ---------------------------------------------------------------------------
  // ARM: Bot Service deployment (fire-and-forget, health-check polling detects readiness)
  // ---------------------------------------------------------------------------

  /**
   * Deploys the Azure Bot resource + MsTeamsChannel into the user's Azure subscription
   * using the ARM REST API and a management-scoped access token derived from the refresh token.
   *
   * Flow:
   *   1. Exchange refresh token for management.azure.com access token
   *   2. List subscriptions and pick the first one
   *   3. Create resource group rg-{botName}
   *   4. PUT Bot Service (SingleTenant, F0, messaging endpoint = Novu webhook)
   *   5. PUT MsTeamsChannel on the Bot Service
   *
   * Writes integration.provisioning.status throughout so the health-check endpoint
   * can answer "was the Azure Bot created?" without needing ARM credentials at query time.
   * All errors are non-fatal — provisioning.status=failed is written and propagation continues.
   */
  private async tryDeployBotService(
    refreshToken: string,
    appId: string,
    tenantId: string,
    stateData: AzureSetupStateData
  ): Promise<void> {
    this.logger.info(`Azure setup: starting ARM bot deployment for integrationId=${stateData.integrationId}`);

    await this.writeProvisioning(stateData, { status: 'pending', startedAt: new Date().toISOString() });

    try {
      let managementToken: string;

      try {
        managementToken = await this.exchangeRefreshTokenForManagementToken(refreshToken);
        this.logger.info(`Azure setup: management token acquired integrationId=${stateData.integrationId}`);
      } catch (error) {
        throw new Error(
          `ARM step [exchange-management-token] failed: ${this.axiosErrorMessage(error)} responseBody=${JSON.stringify((error as AxiosError)?.response?.data ?? null)}`
        );
      }

      const subscriptionId = await this.getFirstSubscriptionId(managementToken);

      if (!subscriptionId) {
        this.logger.warn(
          `Azure setup: no Azure subscription found — marking provisioning failed integrationId=${stateData.integrationId}`
        );
        await this.writeProvisioning(stateData, {
          status: 'failed',
          completedAt: new Date().toISOString(),
          errorMessage: 'No enabled Azure subscription found in the account.',
        });

        return;
      }

      const integration = await this.integrationRepository.findOne({
        _id: stateData.integrationId,
        _organizationId: stateData.organizationId,
      });

      const botName = this.sanitizeBotName(integration?.name ?? 'NovuBot');
      const displayName = integration?.name ?? 'Novu Bot';
      const resourceGroupName = `rg-${botName}`;
      const webhookEndpoint = await this.resolveWebhookEndpoint(stateData);

      this.logger.info(
        `Azure setup: ARM parameters integrationId=${stateData.integrationId} subscriptionId=${subscriptionId} resourceGroup=${resourceGroupName} botName=${botName} webhookEndpoint=${webhookEndpoint}`
      );

      const armHeaders = {
        Authorization: `Bearer ${managementToken}`,
        'Content-Type': 'application/json',
      };

      // 1. Create resource group
      const rgUrl = `${MS_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}?api-version=${MS_ARM_API_VERSION}`;

      try {
        await axios.put(
          rgUrl,
          { location: 'eastus', tags: { 'created-by': 'novu-quick-setup' } },
          { headers: armHeaders }
        );
        this.logger.info(
          `Azure setup: resource group created/ensured rg=${resourceGroupName} sub=${subscriptionId} integrationId=${stateData.integrationId}`
        );
      } catch (error) {
        throw new Error(
          `ARM step [create-resource-group] failed url=${rgUrl} error="${this.axiosErrorMessage(error)}" responseBody=${JSON.stringify((error as AxiosError)?.response?.data ?? null)}`
        );
      }

      // 2. Create Bot Service
      const botUrl = `${MS_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.BotService/botServices/${botName}?api-version=${MS_BOT_SERVICE_API_VERSION}`;

      try {
        await axios.put(
          botUrl,
          {
            location: 'global',
            kind: 'azurebot',
            sku: { name: 'F0' },
            properties: {
              displayName,
              endpoint: webhookEndpoint,
              msaAppId: appId,
              msaAppTenantId: tenantId,
              msaAppType: 'SingleTenant',
            },
          },
          { headers: armHeaders }
        );
        this.logger.info(
          `Azure setup: Bot Service created botName=${botName} appId=${appId} tenantId=${tenantId} integrationId=${stateData.integrationId}`
        );
      } catch (error) {
        throw new Error(
          `ARM step [create-bot-service] failed url=${botUrl} appId=${appId} tenantId=${tenantId} webhookEndpoint=${webhookEndpoint} error="${this.axiosErrorMessage(error)}" responseBody=${JSON.stringify((error as AxiosError)?.response?.data ?? null)}`
        );
      }

      // 3. Enable Teams channel
      const channelUrl = `${MS_ARM_BASE_URL}/subscriptions/${subscriptionId}/resourceGroups/${resourceGroupName}/providers/Microsoft.BotService/botServices/${botName}/channels/MsTeamsChannel?api-version=${MS_BOT_SERVICE_API_VERSION}`;

      try {
        await axios.put(
          channelUrl,
          {
            location: 'global',
            kind: 'azurebot',
            properties: {
              channelName: 'MsTeamsChannel',
              location: 'global',
              properties: { isEnabled: true, enableCalling: false, acceptedTerms: true },
            },
          },
          { headers: armHeaders }
        );
        this.logger.info(
          `Azure setup: Teams channel enabled botName=${botName} integrationId=${stateData.integrationId}`
        );
      } catch (error) {
        throw new Error(
          `ARM step [enable-teams-channel] failed url=${channelUrl} error="${this.axiosErrorMessage(error)}" responseBody=${JSON.stringify((error as AxiosError)?.response?.data ?? null)}`
        );
      }

      await this.writeProvisioning(stateData, { status: 'ready', completedAt: new Date().toISOString() });

      this.logger.info(
        `Azure setup: ARM deployment complete integrationId=${stateData.integrationId} subscriptionId=${subscriptionId} resourceGroup=${resourceGroupName} botName=${botName}`
      );
    } catch (error) {
      const errorMessage = this.axiosErrorMessage(error);

      this.logger.warn(
        `Azure setup: ARM deployment failed — marking provisioning failed integrationId=${stateData.integrationId} error="${errorMessage}"`
      );

      await this.writeProvisioning(stateData, {
        status: 'failed',
        completedAt: new Date().toISOString(),
        errorMessage,
      });

      throw error;
    }
  }

  private async writeProvisioning(
    stateData: AzureSetupStateData,
    provisioning: {
      status: 'pending' | 'ready' | 'failed';
      startedAt?: string;
      completedAt?: string;
      errorMessage?: string;
      teamsAppCatalogId?: string;
    }
  ): Promise<void> {
    try {
      /*
       * Use dot-notation $set so each call only updates the provided fields, not the whole
       * provisioning sub-document. This preserves teamsAppCatalogId when subsequent calls
       * (e.g. from tryDeployBotService) update status/completedAt without knowing the catalog ID.
       */
      const fields: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(provisioning)) {
        if (value !== undefined) {
          fields[`provisioning.${key}`] = value;
        }
      }

      await this.integrationRepository.update(
        { _id: stateData.integrationId, _organizationId: stateData.organizationId },
        { $set: fields }
      );
    } catch (err) {
      this.logger.warn(
        `Azure setup: failed to write provisioning state integrationId=${stateData.integrationId} status=${provisioning.status} error="${(err as Error).message}"`
      );
    }
  }

  private async getFirstSubscriptionId(managementToken: string): Promise<string | null> {
    try {
      const response = await axios.get<{ value: Array<{ subscriptionId: string; state: string }> }>(
        `${MS_ARM_BASE_URL}/subscriptions?api-version=${MS_ARM_API_VERSION}`,
        { headers: { Authorization: `Bearer ${managementToken}` } }
      );

      const enabled = response.data.value.find((s) => s.state === 'Enabled') ?? response.data.value[0];

      return enabled?.subscriptionId ?? null;
    } catch (error) {
      this.logger.warn(`Azure setup: failed to list subscriptions: ${this.axiosErrorMessage(error)}`);

      return null;
    }
  }

  private sanitizeBotName(name: string): string {
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);

    return sanitized.length < 2 ? 'novubot' : sanitized;
  }

  private async resolveWebhookEndpoint(stateData: AzureSetupStateData): Promise<string> {
    const base = (process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(/\/$/, '');

    const link = await this.agentIntegrationRepository.findOne(
      {
        _integrationId: stateData.integrationId,
        _environmentId: stateData.environmentId,
        _organizationId: stateData.organizationId,
      },
      ['_agentId']
    );

    if (!link) {
      return `${base}/v1/agents/unknown/webhook/${stateData.integrationId}`;
    }

    const integration = await this.integrationRepository.findOne({
      _id: stateData.integrationId,
      _organizationId: stateData.organizationId,
    });

    const integrationIdentifier = integration?.identifier ?? stateData.integrationId;

    return `${base}/v1/agents/${link._agentId}/webhook/${integrationIdentifier}`;
  }

  // ---------------------------------------------------------------------------
  // Teams app catalog upload (best-effort, falls back gracefully)
  // ---------------------------------------------------------------------------
  /**
   * Uploads the Teams app zip to the org catalog and returns the catalog's internal app ID,
   * which differs from the Azure client ID (appId) and is required for the add-to-Teams deep link.
   * Returns null on failure — the user will need to upload manually.
   */
  private async tryUploadTeamsApp(
    accessToken: string,
    appId: string,
    stateData: AzureSetupStateData
  ): Promise<string | null> {
    this.logger.info(
      `Azure setup: attempting automatic Teams app catalog upload for appId=${appId} integrationId=${stateData.integrationId}`
    );

    try {
      const integration = await this.integrationRepository.findOne({
        _id: stateData.integrationId,
        _organizationId: stateData.organizationId,
      });

      const zip = await this.buildTeamsAppZip(appId, integration?.name ?? 'Novu Bot');

      const response = await axios.post<{ id: string }>(`${MS_GRAPH_BASE_URL}/appCatalogs/teamsApps`, zip, {
        headers: {
          ...this.graphHeaders(accessToken),
          'Content-Type': 'application/zip',
        },
      });

      const catalogId = response.data?.id ?? null;

      this.logger.info(
        `Azure setup: Teams app uploaded to catalog successfully appId=${appId} catalogId=${catalogId} integrationId=${stateData.integrationId}`
      );

      if (catalogId) {
        // Persist the catalog ID so the frontend can build the add-to-Teams deep link.
        // Only teamsAppCatalogId is written here — status/startedAt are written by tryDeployBotService.
        await this.writeProvisioning(stateData, {
          status: 'pending',
          teamsAppCatalogId: catalogId,
        });
      }

      return catalogId;
    } catch (error) {
      const message = this.axiosErrorMessage(error);
      const status =
        error instanceof Error && 'response' in error
          ? (error as { response?: { status?: number } }).response?.status
          : undefined;

      // Permission or policy failure — non-fatal; the user will fall back to manual upload
      this.logger.warn(
        `Azure setup: Teams app catalog upload failed (user must upload manually) appId=${appId} integrationId=${stateData.integrationId} httpStatus=${status ?? 'n/a'} error="${message}"`
      );

      return null;
    }
  }

  private async buildTeamsAppZip(appId: string, agentName: string): Promise<Buffer> {
    const manifest = this.buildManifest(appId, agentName);
    const manifestBytes = Buffer.from(JSON.stringify(manifest, null, 2), 'utf-8');

    // Minimal 1x1 transparent PNG placeholder icon (smallest valid PNG)
    const transparentPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
      'base64'
    );

    return buildZip([
      { name: 'manifest.json', data: manifestBytes },
      { name: 'color.png', data: transparentPng },
      { name: 'outline.png', data: transparentPng },
    ]);
  }

  private buildManifest(appId: string, agentName: string): Record<string, unknown> {
    const apiBaseUrl = (process.env.API_ROOT_URL ?? 'https://api.novu.co').replace(/\/$/, '');
    let hostname = 'api.novu.co';

    try {
      hostname = new URL(apiBaseUrl).hostname;
    } catch {
      // keep default
    }

    return {
      $schema: 'https://developer.microsoft.com/json-schemas/teams/v1.16/MicrosoftTeams.schema.json',
      manifestVersion: '1.16',
      version: '1.0.0',
      id: appId,
      developer: {
        name: 'Your Company',
        websiteUrl: 'https://your-domain.com',
        privacyUrl: 'https://your-domain.com/privacy',
        termsOfUseUrl: 'https://your-domain.com/terms',
      },
      name: { short: agentName, full: `${agentName} — powered by Novu` },
      description: { short: `${agentName} bot`, full: 'A conversational agent powered by Novu.' },
      icons: { outline: 'outline.png', color: 'color.png' },
      accentColor: '#FFFFFF',
      bots: [
        {
          botId: appId,
          scopes: ['personal', 'team', 'groupchat'],
          supportsFiles: false,
          isNotificationOnly: false,
        },
      ],
      permissions: ['identity', 'messageTeamMembers'],
      validDomains: [hostname],
      webApplicationInfo: { id: appId, resource: `api://${hostname}/${appId}` },
      authorization: {
        permissions: {
          resourceSpecific: [{ name: 'ChannelMessage.Read.Group', type: 'Application' }],
        },
      },
    };
  }

  private graphHeaders(accessToken: string): Record<string, string> {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  private axiosErrorMessage(error: unknown): string {
    if (error instanceof AxiosError) {
      const detail = error.response?.data?.error?.message ?? error.message;

      return detail as string;
    }

    return error instanceof Error ? error.message : String(error);
  }
}
