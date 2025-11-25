import { ApiProperty } from '@nestjs/swagger';

export class GenerateChatOAuthUrlResponseDto {
  @ApiProperty({
    description:
      'The OAuth authorization URL for the chat provider. ' +
      'For Slack: https://slack.com/oauth/v2/authorize?... ' +
      'For MS Teams: https://login.microsoftonline.com/.../adminconsent?... ' +
      'This URL should be presented to the user to authorize the integration. Expires after 5 minutes.',
    example: 'https://slack.com/oauth/v2/authorize?state=...',
  })
  url: string;
}
