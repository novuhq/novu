import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';

const SLACK_CONFIG_TOKEN_PATTERN = /^xoxe\.xoxp-/;

export class ConsumeSlackSetupLinkRequestDto {
  @ApiProperty({ type: String, description: 'Signed Slack setup token issued by the connect CLI' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({
    type: String,
    description: 'Slack App Configuration Token (xoxe.xoxp-…) from api.slack.com/apps',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(SLACK_CONFIG_TOKEN_PATTERN, {
    message: 'configToken must be a Slack App Configuration Token (xoxe.xoxp-…)',
  })
  configToken: string;
}

export class ConsumeSlackSetupLinkResponseDto {
  @ApiProperty({ type: Boolean })
  success: boolean;
}
