import { ApiProperty } from '@nestjs/swagger';
import { IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsArray, IsDefined, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiContextPayload } from '../../shared/framework/swagger/context-payload.decorator';
import { SLACK_DEFAULT_OAUTH_SCOPES } from '../usecases/generate-chat-oath-url/generate-slack-oath-url/generate-slack-oauth-url.usecase';

export class GenerateChatOauthUrlRequestDto {
  @ApiProperty({
    type: String,
    description: 'The subscriber ID to link the integration to',
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
    description: 'Identifier of the channel connection that will be created',
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
    description: `OAuth scopes to request during authorization. These define the permissions your chat integration will have. If not specified, default scopes will be used: ${SLACK_DEFAULT_OAUTH_SCOPES.join(', ')}.`,
    example: [
      'chat:write',
      'chat:write.public',
      'channels:read',
      'groups:read',
      'users:read',
      'users:read.email',
      'incoming-webhook',
    ],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  scope?: string[];
}
