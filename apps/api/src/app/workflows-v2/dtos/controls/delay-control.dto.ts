import { ApiProperty } from '@nestjs/swagger';
import { DelayTypeEnum, TimeUnitEnum } from '@novu/shared';
import { IsEnum, IsNumber, Min, ValidateIf } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class DelayControlDto extends SkipControlDto {
  @ApiProperty({
    description: "Type of the delay. Currently only 'regular' is supported by the schema.",
    enum: [DelayTypeEnum.REGULAR],
    default: DelayTypeEnum.REGULAR,
  })
  @IsEnum({ REGULAR: DelayTypeEnum.REGULAR })
  type: DelayTypeEnum.REGULAR;

  @ApiProperty({
    description: 'Amount of time to delay.',
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({
    description: 'Unit of time for the delay amount.',
    enum: TimeUnitEnum,
  })
  @IsEnum(TimeUnitEnum)
  unit: TimeUnitEnum;
}
