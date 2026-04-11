import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DelayTypeEnum, TimeUnitEnum } from '@novu/shared';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateIf } from 'class-validator';
import { SkipControlDto } from '../skip.dto';

export class DelayControlDto extends SkipControlDto {
  @ApiProperty({
    description: "Type of the delay. Currently only 'regular' and 'none' are supported by the schema.",
    enum: [DelayTypeEnum.REGULAR, DelayTypeEnum.TIMED, DelayTypeEnum.NONE],
    default: DelayTypeEnum.REGULAR,
  })
  @IsEnum([DelayTypeEnum.REGULAR, DelayTypeEnum.TIMED, DelayTypeEnum.NONE])
  @IsOptional()
  type?: DelayTypeEnum.REGULAR | DelayTypeEnum.TIMED | DelayTypeEnum.NONE;

  @ApiPropertyOptional({
    description: 'Amount of time to delay.',
    type: Number,
    minimum: 1,
  })
  @ValidateIf((obj) => obj.type === DelayTypeEnum.REGULAR)
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Unit of time for the delay amount.',
    enum: TimeUnitEnum,
  })
  @ValidateIf((obj) => obj.type === DelayTypeEnum.REGULAR)
  @IsEnum(TimeUnitEnum)
  @IsOptional()
  unit?: TimeUnitEnum;

  @ApiPropertyOptional({
    description: 'Cron expression for the delay. Min length 1.',
    type: String,
  })
  @ValidateIf((obj) => obj.type === DelayTypeEnum.TIMED)
  @IsString()
  @MinLength(1)
  @IsOptional()
  cron?: string;
}
