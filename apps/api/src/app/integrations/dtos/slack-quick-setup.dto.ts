import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDefined, IsMongoId, IsOptional, IsString } from 'class-validator';

export class SlackQuickSetupRequestDto {
  @ApiProperty({
    description:
      'A Slack App Configuration Token (xoxe.xoxp-... prefix). Used ephemerally to create the Slack app — never stored.',
    example: 'xoxe.xoxp-1-...',
  })
  @IsDefined()
  @IsString()
  configToken: string;

  @ApiProperty({
    description: 'The internal MongoDB `_id` of the agent. Used to build the Slack event webhook URL.',
    example: '69f84d848bed9b0a73216d96',
  })
  @IsDefined()
  @IsMongoId()
  agentId: string;

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

export class SlackQuickSetupResponseDto {}
