import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsMongoId, IsOptional, IsString, MaxLength } from 'class-validator';

/** The longest app name Slack takes in a manifest. */
export const SLACK_APP_NAME_MAX_LENGTH = 35;

export class SlackQuickSetupRequestDto {
  @ApiProperty({
    description:
      'A Slack App Configuration Token (xoxe.xoxp-... prefix). Used ephemerally to create the Slack app — never stored.',
    example: 'xoxe.xoxp-1-...',
  })
  @IsDefined()
  @IsString()
  configToken: string;

  @ApiPropertyOptional({
    description:
      'The name of the Slack app and its bot user, as people see it in Slack. Defaults to the integration name. Slack takes up to 35 characters and drops the word "Slack".',
    example: 'Acme Notifications',
  })
  @IsOptional()
  @IsString()
  @MaxLength(SLACK_APP_NAME_MAX_LENGTH)
  appName?: string;

  @ApiPropertyOptional({
    description:
      'The internal MongoDB `_id` of the agent. Used to build the Slack event webhook URL. Omit it to create a notifications app, which only sends messages.',
    example: '69f84d848bed9b0a73216d96',
  })
  @IsOptional()
  @IsMongoId()
  agentId?: string;

  @ApiPropertyOptional({
    description:
      'The subscriber ID to scope the Slack workspace connection to. When provided the resulting channel connection is created in "subscriber" mode.',
    example: 'user-123:agent-quickstart:agent-abc',
  })
  @IsOptional()
  @IsString()
  subscriberId?: string;

  @ApiPropertyOptional({
    description:
      'A stable identifier for the channel connection that will be created after the OAuth flow completes. Useful for idempotent re-installs.',
    example: 'user-123:agent-quickstart:agent-abc',
  })
  @IsOptional()
  @IsString()
  connectionIdentifier?: string;
}

export class SlackQuickSetupResponseDto {
  @ApiPropertyOptional({
    description: 'The ID of the Slack app that was created, for linking to its settings in Slack.',
    example: 'A0123456789',
  })
  appId?: string;
}
