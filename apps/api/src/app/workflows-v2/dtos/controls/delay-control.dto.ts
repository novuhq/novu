import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeUnitEnum } from '@novu/shared';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength } from 'class-validator';
import { SkipControlDto } from './skip.dto';

export class DelayControlDto extends SkipControlDto {
  @ApiPropertyOptional({
    description: 'Amount of time to delay.',
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  amount?: number;

  @ApiPropertyOptional({
    description: 'Unit of time for the delay amount.',
    enum: TimeUnitEnum,
  })
  @IsEnum(TimeUnitEnum)
  unit?: TimeUnitEnum;

  @ApiPropertyOptional({
    description: 'Cron expression for the delay. Min length 1.',
    type: String,
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  cron?: string;
}
