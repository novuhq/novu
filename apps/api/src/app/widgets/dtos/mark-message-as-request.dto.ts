import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsObject, IsOptional, ValidateNested } from 'class-validator';
import { IsMongoIdOrArrayOfMongoIds } from '../../shared/validators/is-mongo-id-or-array-of-ids.validator';

class MarkMessageFields {
  @ApiPropertyOptional({
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
  seen?: boolean;

  @ApiPropertyOptional({
    type: Boolean,
  })
  @IsOptional()
  @IsBoolean()
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
  @IsDefined()
  @IsMongoIdOrArrayOfMongoIds({ fieldName: 'messageId' })
  messageId: string | string[];

  @ApiProperty({
    type: MarkMessageFields,
  })
  @IsDefined()
  @IsObject()
  @ValidateNested()
  @Type(() => MarkMessageFields)
  mark: MarkMessageFields;
}
