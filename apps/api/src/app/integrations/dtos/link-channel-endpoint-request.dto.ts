import { ApiProperty } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload } from '@novu/shared';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LinkChannelEndpointRequestDto {
  @ApiProperty({
    type: String,
    description: 'Integration identifier for the chat provider integration',
    example: 'telegram-bot',
  })
  @IsString()
  @IsNotEmpty()
  integrationIdentifier: string;

  @ApiProperty({
    type: String,
    description: 'External subscriber identifier to link to their chat identity',
    example: 'subscriber-123',
  })
  @IsString()
  @IsNotEmpty()
  subscriberId: string;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;
}
