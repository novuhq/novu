import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardInboxHashesResponseDto {
  @ApiProperty({ description: 'HMAC hash of the authenticated user subscriber id' })
  subscriberHash: string;

  @ApiProperty({ description: 'HMAC hash of the web chat tester subscriber id of the authenticated user' })
  webChatSubscriberHash: string;

  @ApiPropertyOptional({ description: 'HMAC hash of the requested agent identifier' })
  agentHash?: string;
}
