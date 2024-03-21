import { ApiProperty } from '@nestjs/swagger';
import { MarkMessagesAsEnum } from '@novu/shared';
import { IsDefined, IsEnum } from 'class-validator';

export class MessageMarkAsRequestDto {
  @ApiProperty({
    oneOf: [
      { type: 'string' },
      {
        type: 'array',
        items: {
          type: 'string',
        },
      },
    ],
  })
  messageId: string | string[];

  @ApiProperty({
    enum: MarkMessagesAsEnum,
  })
  @IsDefined()
  @IsEnum(MarkMessagesAsEnum)
  markAs: MarkMessagesAsEnum;
}
