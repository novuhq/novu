import { ApiPropertyOptional } from '@nestjs/swagger';
import { ICredentials } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsObject, IsOptional, IsString, ValidateIf } from 'class-validator';
import { TransformToBoolean } from '../decorators/to-boolean';

export class CredentialsDto implements ICredentials {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  user?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  secretKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  domain?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  password?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  host?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  port?: string;

  @ApiPropertyOptional()
  @TransformToBoolean()
  @IsBoolean()
  @IsOptional()
  secure?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  region?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accountSid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  messageProfileId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  token?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  from?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  senderName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  projectName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  applicationId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  clientId?: string;

  @ApiPropertyOptional()
  @TransformToBoolean()
  @IsBoolean()
  @IsOptional()
  requireTls?: boolean;

  @ApiPropertyOptional()
  @TransformToBoolean()
  @IsBoolean()
  @IsOptional()
  ignoreTls?: boolean;

  @ApiPropertyOptional()
  @Transform(({ value }) => {
    if (value === '' || value === null) return undefined;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        return typeof parsed === 'object' && parsed !== null ? parsed : value;
      } catch {
        return value;
      }
    }

    return value;
  })
  @IsObject()
  @IsOptional()
  tlsOptions?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  webhookUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  redirectUrl?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  hmac?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  serviceAccount?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ipPoolName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiKeyRequestHeader?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  secretKeyRequestHeader?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  idPath?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  datePath?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  apiToken?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  authenticateByToken?: boolean;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  authenticationTokenKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  instanceId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  alertUid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  imageUrl?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  externalLink?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  channelId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  phoneNumberIdentification?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  accessKey?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  appSid?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  senderId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tenantId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  AppIOBaseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  signingSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outboundIntegrationId?: string;

  @ApiPropertyOptional()
  @TransformToBoolean()
  @IsBoolean()
  @IsOptional()
  useFromAddressOverride?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_, v) => typeof v === 'string' && v.trim().length > 0)
  @IsEmail()
  fromAddressOverride?: string;

  @ApiPropertyOptional({
    description:
      'Claude Managed Agents: ID of the Anthropic environment tied to this integration. ' +
      'Hydrated by the API at integration provisioning time.',
  })
  @IsString()
  @IsOptional()
  externalEnvironmentId?: string;

  @ApiPropertyOptional({
    description:
      'Claude Managed Agents: id of the Anthropic workspace used in console deep links. ' +
      "Defaults to `'default'` (the Default Workspace). " +
      'Set this when the API key is scoped to a custom workspace (e.g. `wrkspc_…`).',
  })
  @IsString()
  @IsOptional()
  externalWorkspaceId?: string;
}
