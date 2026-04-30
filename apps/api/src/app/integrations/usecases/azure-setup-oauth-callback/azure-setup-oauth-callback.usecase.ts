import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, encryptCredentials, PinoLogger } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
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

@Injectable()
export class AzureSetupOauthCallback {
  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
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

    const accessToken = await this.exchangeCodeForToken(command.code);

    const { appId, secretValue, tenantId } = await this.createAppRegistration(accessToken, stateData);

    this.logger.info(
      `Azure setup: app registration created appId=${appId} tenantId=${tenantId} integrationId=${stateData.integrationId}`
    );

    await this.saveCredentials(stateData, appId, secretValue, tenantId);

    this.logger.info(`Azure setup: credentials saved for integrationId=${stateData.integrationId}`);

    const teamsAppUploaded = await this.tryUploadTeamsApp(accessToken, appId, stateData);

    return { html: AzureSetupOauthCallback.buildPopupHtml({ success: true, teamsAppUploaded }) };
  }

  static buildPopupHtml({
    success,
    errorMessage,
    teamsAppUploaded,
  }: {
    success: boolean;
    errorMessage?: string;
    teamsAppUploaded?: boolean;
  }): string {
    const message = success
      ? { type: 'novu:azure-setup-complete', success: true, teamsAppUploaded: teamsAppUploaded ?? false }
      : { type: 'novu:azure-setup-complete', success: false, error: errorMessage ?? 'Unknown error' };

    const messageJson = JSON.stringify(message);

    return `<script>
  try { window.opener && window.opener.postMessage(${messageJson}, '*'); } catch (_) {}
  window.close();
</script>`;
  }

  // ---------------------------------------------------------------------------
  // State verification
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Token exchange
  // ---------------------------------------------------------------------------

  private async exchangeCodeForToken(code: string): Promise<string> {
    const clientId = process.env.NOVU_AZURE_CLIENT_ID;
    const clientSecret = process.env.NOVU_AZURE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new NotFoundException('Azure Quick Setup is not configured on this Novu instance');
    }

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: GenerateAzureSetupOauthUrl.buildRedirectUri(),
      scope: AZURE_SETUP_OAUTH_SCOPES.filter((s) => s.startsWith('https://graph.microsoft.com/')).join(' '),
    });

    try {
      const response = await axios.post<{ access_token: string; tenant?: string }>(
        `${MS_LOGIN_BASE_URL}/organizations/oauth2/v2.0/token`,
        params.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      );

      return response.data.access_token;
    } catch (error) {
      throw new BadRequestException(`Failed to exchange authorization code: ${this.axiosErrorMessage(error)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // Graph: App Registration creation
  // ---------------------------------------------------------------------------

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

  // ---------------------------------------------------------------------------
  // Save credentials into the integration
  // ---------------------------------------------------------------------------

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
  // Teams app catalog upload (best-effort, falls back gracefully)
  // ---------------------------------------------------------------------------

  private async tryUploadTeamsApp(
    accessToken: string,
    appId: string,
    stateData: AzureSetupStateData
  ): Promise<boolean> {
    this.logger.info(
      `Azure setup: attempting automatic Teams app catalog upload for appId=${appId} integrationId=${stateData.integrationId}`
    );

    try {
      const integration = await this.integrationRepository.findOne({
        _id: stateData.integrationId,
        _organizationId: stateData.organizationId,
      });

      const zip = await this.buildTeamsAppZip(appId, integration?.name ?? 'Novu Bot');

      await axios.post(`${MS_GRAPH_BASE_URL}/appCatalogs/teamsApps`, zip, {
        headers: {
          ...this.graphHeaders(accessToken),
          'Content-Type': 'application/zip',
        },
      });

      this.logger.info(
        `Azure setup: Teams app uploaded to catalog successfully appId=${appId} integrationId=${stateData.integrationId}`
      );

      return true;
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

      return false;
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

    return this.buildZip([
      { name: 'manifest.json', data: manifestBytes },
      { name: 'color.png', data: transparentPng },
      { name: 'outline.png', data: transparentPng },
    ]);
  }

  /**
   * Minimal ZIP builder (store-only, no compression) — no external dependencies.
   */
  private buildZip(files: { name: string; data: Buffer }[]): Buffer {
    const parts: Buffer[] = [];
    const centralEntries: Buffer[] = [];
    let offset = 0;

    for (const file of files) {
      const nameBytes = Buffer.from(file.name, 'utf-8');
      const crc = this.crc32(file.data);

      // Local file header
      const local = Buffer.allocUnsafe(30 + nameBytes.length);
      local.writeUInt32LE(0x04034b50, 0); // signature
      local.writeUInt16LE(20, 4); // version needed
      local.writeUInt16LE(0, 6); // flags
      local.writeUInt16LE(0, 8); // compression (store)
      local.writeUInt16LE(0, 10); // mod time
      local.writeUInt16LE(0, 12); // mod date
      local.writeUInt32LE(crc, 14);
      local.writeUInt32LE(file.data.length, 18); // compressed size
      local.writeUInt32LE(file.data.length, 22); // uncompressed size
      local.writeUInt16LE(nameBytes.length, 26);
      local.writeUInt16LE(0, 28); // extra field length
      nameBytes.copy(local, 30);

      parts.push(local, file.data);

      // Central directory entry
      const central = Buffer.allocUnsafe(46 + nameBytes.length);
      central.writeUInt32LE(0x02014b50, 0); // signature
      central.writeUInt16LE(20, 4); // version made by
      central.writeUInt16LE(20, 6); // version needed
      central.writeUInt16LE(0, 8); // flags
      central.writeUInt16LE(0, 10); // compression
      central.writeUInt16LE(0, 12); // mod time
      central.writeUInt16LE(0, 14); // mod date
      central.writeUInt32LE(crc, 16);
      central.writeUInt32LE(file.data.length, 20); // compressed size
      central.writeUInt32LE(file.data.length, 24); // uncompressed size
      central.writeUInt16LE(nameBytes.length, 28);
      central.writeUInt16LE(0, 30); // extra field length
      central.writeUInt16LE(0, 32); // comment length
      central.writeUInt16LE(0, 34); // disk start
      central.writeUInt16LE(0, 36); // internal attributes
      central.writeUInt32LE(0, 38); // external attributes
      central.writeUInt32LE(offset, 42); // local header offset
      nameBytes.copy(central, 46);

      centralEntries.push(central);
      offset += 30 + nameBytes.length + file.data.length;
    }

    const centralSize = centralEntries.reduce((s, e) => s + e.length, 0);
    const eocd = Buffer.allocUnsafe(22);
    eocd.writeUInt32LE(0x06054b50, 0); // signature
    eocd.writeUInt16LE(0, 4); // disk number
    eocd.writeUInt16LE(0, 6); // disk with central dir
    eocd.writeUInt16LE(files.length, 8); // entries on disk
    eocd.writeUInt16LE(files.length, 10); // total entries
    eocd.writeUInt32LE(centralSize, 12);
    eocd.writeUInt32LE(offset, 16);
    eocd.writeUInt16LE(0, 20); // comment length

    return Buffer.concat([...parts, ...centralEntries, eocd]);
  }

  private crc32(data: Buffer): number {
    let crc = 0xffffffff;

    for (let i = 0; i < data.length; i++) {
      crc ^= data[i];
      for (let j = 0; j < 8; j++) {
        crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
      }
    }

    return (crc ^ 0xffffffff) >>> 0;
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

  // ---------------------------------------------------------------------------
  // Utilities
  // ---------------------------------------------------------------------------

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
