import { ApiProperty } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsArray, IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SLACK_DEFAULT_OAUTH_SCOPES } from '../usecases/generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';

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
}
