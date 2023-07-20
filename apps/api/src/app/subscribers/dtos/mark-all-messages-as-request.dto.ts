import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MarkMessagesAsEnum } from '@novu/shared';

export class MarkAllMessageAsRequestDto {
  @ApiPropertyOptional({
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    ],
    description: 'Optional feed id or array of feed ids',
  })
  feedId?: string | string[];

  @ApiProperty({
    enum: MarkMessagesAsEnum,
    description: 'Mark all subscriber messages as read, unread, seen or unseen',
  })
  markAs: MarkMessagesAsEnum;
}
