import { ApiPropertyOptional } from '@nestjs/swagger';
import { DigestTypeEnum, TimeUnitEnum } from '@novu/shared';
import { IsEnum, IsNumber, IsOptional, IsString, Min, MinLength, ValidateNested, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { SkipControlDto } from './skip.dto';
import { LookBackWindowDto } from './look-back-window.dto';

export class DigestControlDto extends SkipControlDto {
  @ApiPropertyOptional({
    description: 'The type of digest strategy. Determines which fields are applicable.',
    enum: [DigestTypeEnum.REGULAR, DigestTypeEnum.TIMED],
  })
  @IsEnum([DigestTypeEnum.REGULAR, DigestTypeEnum.TIMED])
  @IsOptional()
  type?: DigestTypeEnum.REGULAR | DigestTypeEnum.TIMED;

  @ApiPropertyOptional({
    description: 'The amount of time for the digest interval (for REGULAR type). Min 1.',
    type: Number,
    minimum: 1,
  })
  @ValidateIf((obj) => obj.type === DigestTypeEnum.REGULAR)
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'The unit of time for the digest interval (for REGULAR type).',
    enum: TimeUnitEnum,
  })
  @ValidateIf((obj) => obj.type === DigestTypeEnum.REGULAR)
  @IsEnum(TimeUnitEnum)
  @IsOptional()
  unit?: TimeUnitEnum;

  @ApiPropertyOptional({
    description: 'Configuration for look-back window (for REGULAR type).',
    type: LookBackWindowDto,
  })
  @ValidateIf((obj) => obj.type === DigestTypeEnum.REGULAR)
  @ValidateNested()
  @Type(() => LookBackWindowDto)
  @IsOptional()
  lookBackWindow?: LookBackWindowDto;

  @ApiPropertyOptional({
    description: 'Cron expression for TIMED digest. Min length 1.',
    type: String,
  })
  @ValidateIf((obj) => obj.type === DigestTypeEnum.TIMED)
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
