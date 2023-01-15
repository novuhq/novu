import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MarkMessageFields {
  @ApiPropertyOptional({
    type: Boolean,
  })
  seen?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
  })
  read?: boolean;
}

export class MarkMessageAsRequestDto {
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
    type: MarkMessageFields,
  })
  mark: MarkMessageFields;
}
