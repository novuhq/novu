import { Injectable, NotFoundException } from '@nestjs/common';
import { GetDecryptedIntegrations, MsTeamsTokenService, PinoLogger } from '@novu/application-generic';
import { IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import axios from 'axios';
import { MsTeamsHealthCheckCommand } from './msteams-health-check.command';

export type HealthCheckStatus = 'ready' | 'pending' | 'failed';

export interface MsTeamsHealthCheckResult {
  appRegistration: HealthCheckStatus | null;
  azureBotCreated: HealthCheckStatus | null;
  teamsAppCatalog: HealthCheckStatus | null;
  permissions: HealthCheckStatus | null;
  allReady: boolean;
}

/**
 * Verifies the MS Teams integration using credentials and provisioning state stored on the integration.
 *
 * Checkpoints:
 *   1. appRegistration — bot can acquire a Graph token (app registration + secret work)
 *   2. azureBotCreated — Azure Bot resource was successfully created via ARM during Quick Setup
 *                        (reads integration.provisioning.status; missing -> pending because manual setup is untracked)
 *   3. teamsAppCatalog — app found in org catalog via Graph (AppCatalog.Read.All)
 *   4. permissions     — required appRoleAssignments present on the service principal
 *
 * Status meanings:
 *   ready   — check passed
 *   pending — transient failure (token error, 404) — likely Azure propagation delay
 *   failed  — permanent failure (no credentials, misconfiguration)
 */
@Injectable()
export class MsTeamsHealthCheck {
  private readonly MS_GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

  /**
   * The Graph app roles we expect to find granted on the bot's service principal.
   * These match REQUIRED_GRAPH_PERMISSIONS in azure-setup-oauth-callback.usecase.ts.
   */
  private readonly EXPECTED_ROLE_IDS = new Set([
    '7ab1d382-f21e-4acd-a863-ba3e13f7da61', // Directory.Read.All
    '2280dda6-0bfd-44ee-a2f4-cb867cfc4c1e', // Team.ReadBasic.All
    '59a6b24b-4225-4393-8165-ebaec5f55d7a', // Channel.ReadBasic.All
    'e12dae10-5a57-4817-b79d-dfbec5348930', // AppCatalog.Read.All
    '9f67436c-5415-4e7f-8ac1-3014a7132630', // TeamsAppInstallation.ReadWriteSelfForTeam.All
    '908de74d-f8b2-4d6b-a9ed-2a17b3b78179', // TeamsAppInstallation.ReadWriteSelfForUser.All
  ]);

  constructor(
    private integrationRepository: IntegrationRepository,
    private msTeamsTokenService: MsTeamsTokenService,
    private logger: PinoLogger
  ) {
    this.logger.setContext(MsTeamsHealthCheck.name);
  }

  async execute(command: MsTeamsHealthCheckCommand): Promise<MsTeamsHealthCheckResult> {
    const integration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.MsTeams) {
      throw new NotFoundException('Health check is only supported for MS Teams integrations');
    }

    const decrypted = GetDecryptedIntegrations.getDecryptedCredentials(integration);
    const credentials = decrypted.credentials as Record<string, string>;
    const clientId = credentials.clientId ?? '';
    const secretKey = credentials.secretKey ?? '';
    const tenantId = credentials.tenantId ?? '';

    if (!clientId || !secretKey || !tenantId) {
      const failedStatus = (name: string): HealthCheckStatus | null =>
        !command.checks || command.checks.includes(name) ? 'failed' : null;

      return {
        appRegistration: failedStatus('appRegistration'),
        azureBotCreated: failedStatus('azureBotCreated'),
        teamsAppCatalog: failedStatus('teamsAppCatalog'),
        permissions: failedStatus('permissions'),
        allReady: false,
      };
    }

    const shouldRun = (name: string): boolean => !command.checks || command.checks.includes(name);

    // Run only the requested checks in parallel — skipped checks resolve to null immediately
    const [appRegistration, azureBotCreated, teamsAppCatalog, permissions] = await Promise.all([
      shouldRun('appRegistration') ? this.checkAppRegistration(clientId, secretKey, tenantId) : Promise.resolve(null),
      shouldRun('azureBotCreated') ? Promise.resolve(this.checkAzureBotCreated(integration)) : Promise.resolve(null),
      shouldRun('teamsAppCatalog') ? this.checkTeamsAppCatalog(clientId, secretKey, tenantId) : Promise.resolve(null),
      shouldRun('permissions') ? this.checkPermissions(clientId, secretKey, tenantId) : Promise.resolve(null),
    ]);

    // allReady only considers non-null (requested) fields
    const allReady = [appRegistration, azureBotCreated, teamsAppCatalog, permissions]
      .filter((s) => s !== null)
      .every((s) => s === 'ready');

    this.logger.debug(
      `Health check result integrationId=${command.integrationId} appRegistration=${appRegistration} azureBotCreated=${azureBotCreated} teamsAppCatalog=${teamsAppCatalog} permissions=${permissions} allReady=${allReady}`
    );

    return { appRegistration, azureBotCreated, teamsAppCatalog, permissions, allReady };
  }

  /**
   * Check 1: Can the bot acquire a Graph token?
   * If yes, the App Registration, client secret, and service principal all work.
   */
  private async checkAppRegistration(
    clientId: string,
    secretKey: string,
    tenantId: string
  ): Promise<HealthCheckStatus> {
    try {
      const token = await this.msTeamsTokenService.getGraphToken(clientId, secretKey, tenantId);

      return token ? 'ready' : 'pending';
    } catch (error) {
      this.logger.warn(`Health check: appRegistration failed clientId=${clientId} error="${(error as Error).message}"`);

      return 'pending';
    }
  }

  /**
   * Check 2: Was the Azure Bot resource created during Quick Setup?
   * Reads integration.provisioning.status written by tryDeployBotService.
   * Missing provisioning means Quick Setup has not produced a tracked Azure Bot deployment.
   */
  private checkAzureBotCreated(integration: IntegrationEntity): HealthCheckStatus {
    return integration.provisioning?.status ?? 'pending';
  }

  /**
   * Check 3: Is the Teams app published to the org catalog?
   * Queries Graph for the app by externalId (the bot's clientId) with org distribution.
   */
  private async checkTeamsAppCatalog(
    clientId: string,
    secretKey: string,
    tenantId: string
  ): Promise<HealthCheckStatus> {
    try {
      const graphToken = await this.msTeamsTokenService.getGraphToken(clientId, secretKey, tenantId);

      if (!graphToken) {
        return 'pending';
      }

      const filter = encodeURIComponent(`externalId eq '${clientId}' and distributionMethod eq 'organization'`);
      const response = await axios.get<{ value: unknown[] }>(
        `${this.MS_GRAPH_BASE_URL}/appCatalogs/teamsApps?$filter=${filter}`,
        { headers: { Authorization: `Bearer ${graphToken}` }, timeout: 10_000 }
      );

      return response.data.value.length > 0 ? 'ready' : 'pending';
    } catch (error) {
      this.logger.warn(`Health check: teamsAppCatalog failed clientId=${clientId} error="${(error as Error).message}"`);

      return 'pending';
    }
  }

  /**
   * Check 4: Are the required Graph appRoleAssignments propagated on the service principal?
   * Looks up the SP by appId then checks its appRoleAssignments.
   */
  private async checkPermissions(clientId: string, secretKey: string, tenantId: string): Promise<HealthCheckStatus> {
    try {
      const graphToken = await this.msTeamsTokenService.getGraphToken(clientId, secretKey, tenantId);

      if (!graphToken) {
        return 'pending';
      }

      // Resolve service principal for the bot's app
      const spFilter = encodeURIComponent(`appId eq '${clientId}'`);
      const spResponse = await axios.get<{ value: Array<{ id: string }> }>(
        `${this.MS_GRAPH_BASE_URL}/servicePrincipals?$filter=${spFilter}&$select=id`,
        { headers: { Authorization: `Bearer ${graphToken}` }, timeout: 10_000 }
      );

      const spId = spResponse.data.value[0]?.id;

      if (!spId) {
        return 'pending';
      }

      // Check appRoleAssignments on the service principal
      const assignmentsResponse = await axios.get<{ value: Array<{ appRoleId: string }> }>(
        `${this.MS_GRAPH_BASE_URL}/servicePrincipals/${spId}/appRoleAssignments`,
        { headers: { Authorization: `Bearer ${graphToken}` }, timeout: 10_000 }
      );

      const grantedRoleIds = new Set(assignmentsResponse.data.value.map((a) => a.appRoleId));
      const allGranted = [...this.EXPECTED_ROLE_IDS].every((id) => grantedRoleIds.has(id));

      return allGranted ? 'ready' : 'pending';
    } catch (error) {
      this.logger.warn(`Health check: permissions failed clientId=${clientId} error="${(error as Error).message}"`);

      return 'pending';
    }
  }
}
