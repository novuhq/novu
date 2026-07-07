import { GetDecryptedIntegrations, IntegrationResponseDto } from '@novu/application-generic';
import { ICredentialsEntity, IntegrationEntity } from '@novu/dal';
import { IConfigurations } from '@novu/shared';

export function stripSensitiveConfigurations(configurations?: IConfigurations): IConfigurations | undefined {
  if (!configurations) {
    return configurations;
  }

  const { inboundWebhookSigningKey: _removed, ...safeConfigurations } = configurations;

  return safeConfigurations;
}

export function toIntegrationResponseDto(
  integration: IntegrationEntity,
  canAccessCredentials: boolean
): IntegrationResponseDto {
  if (canAccessCredentials) {
    return GetDecryptedIntegrations.getDecryptedCredentials(integration);
  }

  const { credentials: _credentials, configurations, ...integrationWithoutCredentials } = integration;

  return {
    ...integrationWithoutCredentials,
    credentials: {} as ICredentialsEntity,
    configurations: stripSensitiveConfigurations(configurations),
  } as unknown as IntegrationResponseDto;
}
