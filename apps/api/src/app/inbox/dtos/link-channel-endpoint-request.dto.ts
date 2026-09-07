import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Inbox (subscriber-JWT) variant of the channel-endpoint link request.
 * The subscriber is derived from the session token; context follows the same
 * trust model as inbox OAuth connect/link-user.
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

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

  @ApiPropertyOptional({
    type: String,
    description:
      'HMAC-SHA256 of the canonicalized `context`, signed with the tenant environment secret key ' +
      '(the same "Inbox with context" signing scheme). Required when the integration has HMAC ' +
      'validation enabled and the session did not already HMAC-verify the context.',
    example: 'a1b2c3d4e5f6...',
  })
  @IsOptional()
  @IsString()
  contextHash?: string;
}
