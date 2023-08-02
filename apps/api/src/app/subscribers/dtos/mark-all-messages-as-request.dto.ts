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
    description: 'Optional feed identifier or array of feed identifiers',
  })
  feedIdentifier?: string | string[];

  @ApiProperty({
    enum: MarkMessagesAsEnum,
    description: 'Mark all subscriber messages as read, unread, seen or unseen',
  })
  markAs: MarkMessagesAsEnum;
}
