import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { GetDecryptedIntegrations } from '@novu/application-generic';
import { EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { ChatProviderIdEnum } from '@novu/shared';
import { createHmac } from 'crypto';
import { buildAgentApiRootUrl } from '../../../agents/shared/util/agent-api-root-url';
import { areHexDigestsEqual } from '../../../shared/helpers/timing-safe-equal';
import { GenerateMsTeamsArmTemplateCommand } from './generate-msteams-arm-template.command';

const ARM_TEMPLATE_EXPIRY_MS = 15 * 60 * 1000; // 15 minutes

export type MsTeamsArmTemplateResult = {
  /** Signed URL the dashboard can hand to the Azure Portal "Deploy to Azure" button */
  deployUrl: string;
};

@Injectable()
export class GenerateMsTeamsArmTemplate {
  constructor(
    private integrationRepository: IntegrationRepository,
    private environmentRepository: EnvironmentRepository
  ) {}

  async execute(command: GenerateMsTeamsArmTemplateCommand): Promise<MsTeamsArmTemplateResult> {
    const integration = await this.integrationRepository.findOne({
      _id: command.integrationId,
      _organizationId: command.organizationId,
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${command.integrationId} not found`);
    }

    if (integration.providerId !== ChatProviderIdEnum.MsTeams) {
      throw new UnauthorizedException('ARM template is only supported for MS Teams integrations');
    }

    const decrypted = GetDecryptedIntegrations.getDecryptedCredentials(integration);
    const { clientId: appId } = decrypted.credentials as Record<string, string>;

    if (!appId) {
      throw new NotFoundException('MS Teams integration missing App ID (clientId). Configure credentials first.');
    }

    const apiKeys = await this.environmentRepository.getApiKeys(integration._environmentId);

    if (!apiKeys.length) {
      throw new NotFoundException(`Environment for integration ${command.integrationId} not found`);
    }

    const signingKey = apiKeys[0].key;
    const exp = Date.now() + ARM_TEMPLATE_EXPIRY_MS;

    const payload = `${command.integrationId}:${exp}`;
    const sig = createHmac('sha256', signingKey).update(payload).digest('hex');

    const templateApiUrl = this.buildTemplateApiUrl(command.integrationId, sig, exp);
    const deployUrl = `https://portal.azure.com/#create/Microsoft.Template/uri/${encodeURIComponent(templateApiUrl)}`;

    return { deployUrl };
  }

  /**
   * Validates a signed ARM template URL request.
   * Returns the decoded integrationId on success, throws on failure.
   *
   * The route that serves the raw ARM JSON must call this before returning template content.
   */
  static async verifySignature(integrationId: string, sig: string, exp: string, signingKey: string): Promise<void> {
    const expMs = Number(exp);

    if (!Number.isFinite(expMs) || Date.now() > expMs) {
      throw new UnauthorizedException('ARM template link has expired');
    }

    const payload = `${integrationId}:${expMs}`;
    const expected = createHmac('sha256', signingKey).update(payload).digest('hex');

    if (!areHexDigestsEqual(expected, sig)) {
      throw new UnauthorizedException('Invalid ARM template signature');
    }
  }

  private buildTemplateApiUrl(integrationId: string, sig: string, exp: number): string {
    return `${buildAgentApiRootUrl()}/v1/integrations/${integrationId}/msteams-arm-template?sig=${sig}&exp=${exp}`;
  }
}
