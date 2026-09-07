import { ApiProperty } from '@nestjs/swagger';

/**
 * Platform message identifiers returned when a reply or edit is delivered.
 * `null` is returned (as `data: null`) for side-effect-only requests such as
 * typing, reactions, deletes, or signals with no outbound message.
 */
export class SentMessageInfoDto {
  @ApiProperty({
    description: 'Platform-native message id of the delivered or edited message (e.g. Slack `ts`, Teams activity id).',
    example: '1712345678.123456',
  })
  messageId: string;

  @ApiProperty({
    description: 'Platform-native thread / conversation id where the message was delivered.',
    example: 'C0123456789',
  })
  platformThreadId: string;
}
