import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Inbox (subscriber-JWT) variant of the channel-endpoint link request.
 * Unlike the admin variant, the subscriber is derived from the session token,
 * so the body only needs the integration identifier.
 */
export class InboxLinkChannelEndpointRequestDto {
  @ApiProperty({
    type: String,
    description: 'Integration identifier for the chat provider integration',
    example: 'telegram-bot',
  })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;
}
