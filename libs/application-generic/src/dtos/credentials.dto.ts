import { ApiPropertyOptional } from '@nestjs/swagger';
import { ICredentials } from '@novu/shared';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsObject, IsOptional, IsString, Matches, ValidateIf } from 'class-validator';
import { TransformToBoolean } from '../decorators/to-boolean';

/** Lowercase letters, digits and dashes; 1-32 chars; no leading/trailing dash. */
const AGENT_EMAIL_SLUG_PREFIX_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$/;

/** Allowed interpretations of the email webhook HMAC secret key when signing. */
export const HMAC_SECRET_KEY_ENCODINGS = ['text', 'base64', 'hex'] as const;

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

  @ApiPropertyOptional({
    description:
      'Email webhook: how `secretKey` is interpreted when signing webhook calls. ' +
      "`text` signs with the raw UTF-8 bytes; `base64`/`hex` decode it to binary first (e.g. for AWS KMS).",
    enum: [...HMAC_SECRET_KEY_ENCODINGS],
  })
  @IsString()
  @IsIn(HMAC_SECRET_KEY_ENCODINGS)
  @IsOptional()
  hmacSecretKeyEncoding?: (typeof HMAC_SECRET_KEY_ENCODINGS)[number];

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
  configurationSetName?: string;

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
  @IsOptional()
  @IsString()
  outboundConnectedAt?: string;

  @ApiPropertyOptional({
    description:
      "ISO timestamp marking Layer-2 What's next completion (Connected badge + guide hide). " +
      'WhatsApp Business: stamped on post-connect Access Token rotation or manual confirm.',
  })
  @IsOptional()
  @IsString()
  whatsNextCompletedAt?: string;

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
      'Agent default shared inbox slug prefix used in `{emailSlugPrefix}-{agentId}@<shared-domain>`. ' +
      'Only meaningful on the NovuAgent email integration.',
  })
  @IsOptional()
  @IsString()
  @Matches(AGENT_EMAIL_SLUG_PREFIX_REGEX, {
    message: 'emailSlugPrefix must be 1-32 lowercase letters, digits or dashes, and must not start or end with a dash',
  })
  emailSlugPrefix?: string;

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
      'Claude Managed Agents: ID of the Anthropic vault (`vlt_…`) tied to this integration. ' +
      'Hydrated by the API at integration provisioning time and used to push OAuth-completed ' +
      'MCP credentials to the per-vault credentials API.',
  })
  @IsString()
  @IsOptional()
  externalVaultId?: string;

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
