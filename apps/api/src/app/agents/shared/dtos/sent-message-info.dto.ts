import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * Identifiers for a message posted or edited on the destination platform.
 * Returned when the reply endpoint delivers a new message or edits an existing one.
 */
export class SentMessageInfoDto {
  @ApiProperty({
    description: 'Platform-specific message identifier for the posted or edited message.',
    example: 'msg_01HXYZ',
  })
  @IsString()
  @IsNotEmpty()
  messageId: string;

  @ApiProperty({
    description: 'Platform-specific thread identifier the message belongs to.',
    example: 'thread_01HXYZ',
  })
  @IsString()
  @IsNotEmpty()
  platformThreadId: string;
}
