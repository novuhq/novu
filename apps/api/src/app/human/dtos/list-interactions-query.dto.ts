import { ApiPropertyOptional } from '@nestjs/swagger';
import { HumanInteractionStatusEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, Min } from 'class-validator';

export class ListInteractionsQueryDto {
  @ApiPropertyOptional({ enum: HumanInteractionStatusEnum })
  @IsOptional()
  @IsEnum(HumanInteractionStatusEnum)
  status?: HumanInteractionStatusEnum;

  @ApiPropertyOptional({ description: 'Filter to a specific human (subscriberId).' })
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Return interactions created before this internal id (cursor).' })
  @IsOptional()
  @IsMongoId()
  before?: string;
}
