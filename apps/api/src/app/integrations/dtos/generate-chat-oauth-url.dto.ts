import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ConnectionMode, ContextPayload } from '@novu/shared';
import { IsArray, IsBoolean, IsDefined, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  OAuthMode,
  SLACK_DEFAULT_OAUTH_SCOPES,
  SLACK_LINK_USER_OAUTH_SCOPES,
} from '../usecases/generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';

/**
 * @deprecated Use GenerateConnectOauthUrlRequestDto (POST /channel-connections/oauth) or
 * GenerateLinkUserOauthUrlRequestDto (POST /channel-endpoints/oauth) instead.
 */
export class GenerateChatOauthUrlRequestDto {
  @ApiProperty({
    type: String,
    description:
      'The subscriber ID to link the channel connection to. ' +
      'For Slack: Required for incoming webhook endpoints, optional for workspace connections. ' +
      'For MS Teams: Optional. Admin consent is tenant-wide and can be associated with a subscriber for organizational purposes.',
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
  @IsNotEmpty({
    message: 'Integration identifier is required',
  })
  integrationIdentifier: string;

  @ApiProperty({
    type: String,
    description:
      'Identifier of the channel connection that will be created. It is generated automatically if not provided.',
    example: 'slack-connection-abc123',
  })
  @IsString()
  @IsOptional()
  connectionIdentifier?: string;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  @ApiProperty({
    type: [String],
    description:
      `**Slack only**: OAuth scopes to request during authorization. These define the permissions your Slack integration will have. ` +
      `If not specified, default scopes will be used: ${SLACK_DEFAULT_OAUTH_SCOPES.join(', ')}. ` +
      `**MS Teams**: This parameter is ignored. MS Teams uses admin consent with pre-configured permissions in Azure AD. ` +
      `Note: The generated OAuth URL expires after 5 minutes.`,
    example: [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'groups:read',
      'users:read',
      'users:read.email',
      'incoming-webhook',
    ],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      `**Slack only, link_user mode**: User-level OAuth scopes to request during authorization. ` +
      `Used when mode is "link_user" to identify the Slack user via "Sign in with Slack". ` +
      `If not specified, defaults to: ${SLACK_LINK_USER_OAUTH_SCOPES.join(', ')}.`,
    example: ['identity.basic'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userScope?: string[];

  @ApiPropertyOptional({
    type: String,
    description:
      'OAuth flow mode. Use "connect" (default) to create a workspace channel connection, ' +
      'or "link_user" to identify the subscriber\'s Slack user ID without creating a connection.',
    enum: ['connect', 'link_user'],
    example: 'link_user',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['connect', 'link_user'])
  mode?: OAuthMode;

  @ApiPropertyOptional({
    type: String,
    description:
      'Connection mode that determines how the channel connection is scoped. ' +
      'Use "subscriber" (default) to associate the connection with a specific subscriber. ' +
      'Use "shared" to associate the connection with a context instead of a subscriber — ' +
      'subscriberId will not be stored on the connection.',
    enum: ['subscriber', 'shared'],
    example: 'shared',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['subscriber', 'shared'])
  connectionMode?: ConnectionMode;

  @ApiPropertyOptional({
    type: Boolean,
    description:
      'When true, after the workspace/tenant connection is created the OAuth flow also links the subscriber ' +
      'who clicked "Connect" as a personal endpoint. ' +
      'For Slack, this uses the authed_user.id already returned by oauth.v2.access — no extra redirect. ' +
      'For MS Teams, this triggers a second OAuth redirect for delegated user-identity consent. ' +
      'Defaults to false when omitted; the SlackConnectButton and MsTeamsConnectButton SDK components ' +
      'default this to true.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  autoLinkUser?: boolean;
}
