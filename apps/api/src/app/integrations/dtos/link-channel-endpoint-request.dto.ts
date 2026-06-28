import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

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
}
