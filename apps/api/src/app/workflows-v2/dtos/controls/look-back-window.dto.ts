import { ApiProperty } from '@nestjs/swagger';
import { TimeUnitEnum } from '@novu/shared';
import { IsEnum, IsNumber, Min } from 'class-validator';

export class LookBackWindowDto {
  @ApiProperty({
    description: 'Amount of time for the look-back window.',
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Unit of time for the look-back window.',
    enum: TimeUnitEnum,
  })
  @IsEnum(TimeUnitEnum)
  unit: TimeUnitEnum;
}
