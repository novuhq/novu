import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeUnitEnum } from '@novu/shared';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { SkipControlDto } from '../skip.dto';

export class WaitControlDto extends SkipControlDto {
  @ApiPropertyOptional({
    description: 'Amount of time to wait before Expiry. Defaults to 24.',
    type: Number,
    minimum: 1,
    default: 24,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'Unit of time for the wait amount. Defaults to hours.',
    enum: TimeUnitEnum,
    default: TimeUnitEnum.HOURS,
  })
  @IsEnum(TimeUnitEnum)
  @IsOptional()
  unit?: TimeUnitEnum;
}
