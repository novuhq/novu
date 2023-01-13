import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class MarkMessageFields {
  @ApiPropertyOptional({
    type: Boolean,
    required: false,
  })
  seen?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
    required: false,
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
    required: true,
  })
  messageId: string | string[];

  @ApiProperty({
    type: MarkMessageFields,
  })
  mark: MarkMessageFields;
}
