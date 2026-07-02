import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsArray, IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { SLACK_LINK_USER_OAUTH_SCOPES } from '../usecases/generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';

export class GenerateLinkUserOauthUrlRequestDto {
  @ApiProperty({
    type: String,
    description:
      'The subscriber ID to link to their chat identity. Required — this operation always binds ' +
      'a specific subscriber to a user identity in the chat provider.',
    example: 'subscriber-123',
  })
  @IsString()
  @IsDefined()
  @IsNotEmpty({ message: 'subscriberId is required for link_user' })
  subscriberId: string;

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
    description:
      'Identifier of the existing channel connection to associate this user endpoint with. ' +
      'Generated automatically if not provided.',
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
      `**Slack only**: User-level OAuth scopes for "Sign in with Slack". ` +
      `Defaults to: ${SLACK_LINK_USER_OAUTH_SCOPES.join(', ')}. ` +
      `**MS Teams**: ignored — uses delegated OpenID scopes (openid, profile, User.Read).`,
    example: ['identity.basic'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  userScope?: string[];
}
