import { ApiPropertyOptional } from '@nestjs/swagger';
import { TimeUnitEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested } from 'class-validator';
import { LookBackWindowDto } from './look-back-window.dto';
import { SkipControlDto } from './skip.dto';

export class DigestControlDto extends SkipControlDto {
  @ApiPropertyOptional({
    description: 'The amount of time for the digest interval (for REGULAR type). Min 1.',
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'The unit of time for the digest interval (for REGULAR type).',
    enum: TimeUnitEnum,
  })
  @IsEnum(TimeUnitEnum)
  @IsOptional()
  unit?: TimeUnitEnum;

  @ApiPropertyOptional({
    description: 'Configuration for look-back window (for REGULAR type).',
    type: LookBackWindowDto,
  })
  @ValidateNested()
  @Type(() => LookBackWindowDto)
  @IsOptional()
  lookBackWindow?: LookBackWindowDto;

  @ApiPropertyOptional({
    description: 'Cron expression for TIMED digest. Min length 1.',
    type: String,
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  cron?: string;

  @ApiPropertyOptional({
    description: 'Specify a custom key for digesting events instead of the default event key.',
    type: String,
  })
  @IsString()
  @IsOptional()
  digestKey?: string;
}
