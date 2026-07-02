import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GetDecryptedIntegrations } from '@novu/application-generic';
import { AgentIntegrationRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { buildAgentApiRootUrl } from '../../../agents/shared/util/agent-api-root-url';
import { GenerateMsTeamsArmTemplate } from './generate-msteams-arm-template.usecase';

export type GetMsTeamsArmTemplateResult = {
  template: Record<string, unknown>;
};

@Injectable()
export class GetMsTeamsArmTemplate {
  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository,
    private agentIntegrationRepository: AgentIntegrationRepository
  ) {}

  async execute(integrationId: string, sig: string, exp: string): Promise<GetMsTeamsArmTemplateResult> {
    /**
     * Internal lookup by _id only — bypasses the EnforceEnvOrOrgIds constraint.
     * Use only in contexts where the caller has already verified authorization
     * through another mechanism (e.g. HMAC signature validation).
     */
    // @ts-expect-error EnforceEnvOrOrgIds: _id-only query is intentional here (see comment above).
    const integration = await this.integrationRepository.findOne({ _id: integrationId });

    if (!integration) {
      throw new NotFoundException(`Integration ${integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.MsTeams) {
      throw new UnauthorizedException('ARM template is only supported for MS Teams integrations');
    }

    const apiKeys = await this.environmentRepository.getApiKeys(integration._environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment for integration ${integrationId} not found`);
    }

    await GenerateMsTeamsArmTemplate.verifySignature(integrationId, sig, exp, apiKeys[0].key);

    const decrypted = GetDecryptedIntegrations.getDecryptedCredentials(integration);
    const credentials = decrypted.credentials as Record<string, string>;
    const appId = credentials.clientId ?? '';
    const tenantId = credentials.tenantId ?? '';

    const botName = this.sanitizeBotName(integration.name ?? 'NovuBot');
    const displayName = integration.name ?? 'Novu Bot';
    const agentId = await this.resolveLinkedAgentId(
      integrationId,
      integration._environmentId,
      integration._organizationId
    );
    const endpoint = this.buildWebhookUrl(agentId, integration.identifier);

    return { template: buildArmTemplate({ appId, tenantId, botName, displayName, endpoint }) };
  }

  /**
   * Webhook routing resolves the agent via `findByIdForWebhook` — the path segment must be the agent document `_id`,
   * not the human-readable `identifier` (same as the dashboard manual Teams setup instructions).
   */
  private async resolveLinkedAgentId(
    integrationId: string,
    environmentId: string,
    organizationId: string
  ): Promise<string | null> {
    const link = await this.agentIntegrationRepository.findOne(
      {
        _integrationId: integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_agentId']
    );

    return link?._agentId ?? null;
  }

  private sanitizeBotName(name: string): string {
    // Azure Bot resource names: 2-64 chars, alphanumeric and hyphens only
    const sanitized = name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 64);

    if (sanitized.length < 2) {
      return 'bot';
    }

    return sanitized;
  }

  private buildWebhookUrl(agentId: string | null, integrationIdentifier: string): string {
    const base = buildAgentApiRootUrl();

    if (!agentId) {
      return `${base}/v1/agents/unknown/webhook/${integrationIdentifier}`;
    }

    return `${base}/v1/agents/${agentId}/webhook/${integrationIdentifier}`;
  }
}

/**
 * Builds a subscription-scoped ARM template that:
 *   1. Creates a dedicated resource group (rg-{botName}) if it does not exist.
 *   2. Deploys into that resource group:
 *        - Microsoft.BotService/botServices  (SingleTenant Azure Bot, F0 free tier)
 *        - Microsoft.BotService/botServices/channels/MsTeamsChannel  (Teams channel enabled)
 *
 * Using the subscription schema allows resource-group creation in a single "Deploy to Azure" click.
 * Parameters with defaultValue are pre-filled so the Azure Portal form needs minimal manual input.
 * The template contains NO secrets — appId is public, endpoint is a webhook URL.
 */
function buildArmTemplate({
  appId,
  tenantId,
  botName,
  displayName,
  endpoint,
}: {
  appId: string;
  tenantId: string;
  botName: string;
  displayName: string;
  endpoint: string;
}): Record<string, unknown> {
  const resourceGroupName = `rg-${botName}`;

  return {
    $schema: 'https://schema.management.azure.com/schemas/2018-05-01/subscriptionDeploymentTemplate.json#',
    contentVersion: '1.0.0.0',
    parameters: {
      resourceGroupName: {
        type: 'string',
        defaultValue: resourceGroupName,
        metadata: { description: 'Name of the resource group to create or use for the Azure Bot resources.' },
      },
      location: {
        type: 'string',
        defaultValue: 'eastus',
        metadata: { description: 'Azure region for the resource group and bot resources.' },
      },
      botName: {
        type: 'string',
        defaultValue: botName,
        metadata: { description: 'Resource name for the Azure Bot (2-64 chars, alphanumeric and hyphens).' },
      },
      displayName: {
        type: 'string',
        defaultValue: displayName,
        metadata: { description: 'Human-readable display name for the bot.' },
      },
      msaAppId: {
        type: 'string',
        defaultValue: appId,
        metadata: { description: 'The App ID (client ID) from your Azure App Registration.' },
      },
      msaAppTenantId: {
        type: 'string',
        defaultValue: tenantId,
        metadata: { description: 'The Tenant ID of your Azure AD tenant.' },
      },
      botEndpoint: {
        type: 'string',
        defaultValue: endpoint,
        metadata: { description: 'The messaging endpoint URL for your Novu agent webhook.' },
      },
    },
    resources: [
      {
        type: 'Microsoft.Resources/resourceGroups',
        apiVersion: '2022-09-01',
        name: "[parameters('resourceGroupName')]",
        location: "[parameters('location')]",
        properties: {},
      },
      {
        type: 'Microsoft.Resources/deployments',
        apiVersion: '2022-09-01',
        name: 'botDeployment',
        resourceGroup: "[parameters('resourceGroupName')]",
        dependsOn: ["[resourceId('Microsoft.Resources/resourceGroups', parameters('resourceGroupName'))]"],
        properties: {
          mode: 'Incremental',
          expressionEvaluationOptions: { scope: 'inner' },
          parameters: {
            botName: { value: "[parameters('botName')]" },
            displayName: { value: "[parameters('displayName')]" },
            msaAppId: { value: "[parameters('msaAppId')]" },
            msaAppTenantId: { value: "[parameters('msaAppTenantId')]" },
            botEndpoint: { value: "[parameters('botEndpoint')]" },
            location: { value: "[parameters('location')]" },
          },
          template: {
            $schema: 'https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#',
            contentVersion: '1.0.0.0',
            parameters: {
              botName: { type: 'string' },
              displayName: { type: 'string' },
              msaAppId: { type: 'string' },
              msaAppTenantId: { type: 'string' },
              botEndpoint: { type: 'string' },
              location: { type: 'string' },
            },
            resources: [
              {
                type: 'Microsoft.BotService/botServices',
                apiVersion: '2023-09-15-preview',
                name: "[parameters('botName')]",
                location: 'global',
                kind: 'azurebot',
                sku: { name: 'F0' },
                properties: {
                  displayName: "[parameters('displayName')]",
                  endpoint: "[parameters('botEndpoint')]",
                  msaAppId: "[parameters('msaAppId')]",
                  msaAppTenantId: "[parameters('msaAppTenantId')]",
                  msaAppType: 'SingleTenant',
                },
              },
              {
                type: 'Microsoft.BotService/botServices/channels',
                apiVersion: '2023-09-15-preview',
                name: "[concat(parameters('botName'), '/MsTeamsChannel')]",
                location: 'global',
                kind: 'azurebot',
                dependsOn: ["[resourceId('Microsoft.BotService/botServices', parameters('botName'))]"],
                properties: {
                  channelName: 'MsTeamsChannel',
                  location: 'global',
                  properties: {
                    isEnabled: true,
                    enableCalling: false,
                    acceptedTerms: true,
                  },
                },
              },
            ],
          },
        },
      },
    ],
  };
}
