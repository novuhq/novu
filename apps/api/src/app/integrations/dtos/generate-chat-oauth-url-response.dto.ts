import { ApiProperty } from '@nestjs/swagger';

export class GenerateChatOAuthUrlResponseDto {
  @ApiProperty({
    description: 'The OAuth authorization URL',
    example: 'https://slack.com/oauth/v2/authorize?state=...',
  })
  url: string;
}
