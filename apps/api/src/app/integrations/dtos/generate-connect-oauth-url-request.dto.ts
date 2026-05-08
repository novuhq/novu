import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ConnectionMode, ContextPayload } from '@novu/shared';
import { IsArray, IsBoolean, IsDefined, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SLACK_DEFAULT_OAUTH_SCOPES } from '../usecases/generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';

export class GenerateConnectOauthUrlRequestDto {
  @ApiPropertyOptional({
    type: String,
    description:
      'The subscriber ID to associate with the channel connection. ' +
      'For Slack: optional for workspace connections (required only for incoming-webhook scope). ' +
      'For MS Teams: optional. Admin consent is tenant-wide.',
    example: 'subscriber-123',
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @ApiProperty({
    type: String,
    description: 'Integration identifier',
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'Integration identifier is required' })
  integrationIdentifier: string;

  @ApiPropertyOptional({
    type: String,
    description: 'Identifier of the channel connection that will be created. Generated automatically if not provided.',
    example: 'slack-connection-abc123',
  })
  @IsString()
  @IsOptional()
  connectionIdentifier?: string;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  @ApiPropertyOptional({
    type: [String],
    description:
      `**Slack only**: OAuth scopes to request during authorization. ` +
      `If not specified, default scopes will be used: ${SLACK_DEFAULT_OAUTH_SCOPES.join(', ')}. ` +
      `**MS Teams**: ignored — uses admin consent with pre-configured Azure AD permissions.`,
    example: ['chat:write', 'chat:write.public', 'channels:read'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];

  @ApiPropertyOptional({
    type: String,
    description:
      'Connection mode that determines how the channel connection is scoped. ' +
      '"subscriber" (default) associates the connection with a specific subscriber. ' +
      '"shared" associates the connection with a context instead of a subscriber.',
    enum: ['subscriber', 'shared'],
    example: 'shared',
  })
  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'When true (default when connectionMode is "subscriber"), after the workspace/tenant connection is created ' +
      'the OAuth flow also links the subscriber who clicked "Connect" as a personal endpoint. ' +
      'For Slack, uses the authed_user.id returned by oauth.v2.access — no extra redirect. ' +
      'For MS Teams, triggers a second OAuth redirect for delegated user-identity consent. ' +
      'Set to false to only create the workspace connection without linking the individual user.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  autoLinkUser?: boolean;
}
