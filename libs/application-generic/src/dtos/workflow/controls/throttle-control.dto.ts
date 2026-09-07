import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TimeUnitEnum } from '@novu/shared';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min, MinLength } from 'class-validator';
import { SkipControlDto } from '../skip.dto';

// Throttle-specific time units (excluding seconds for performance reasons)
const ThrottleTimeUnitEnum = {
  MINUTES: TimeUnitEnum.MINUTES,
  HOURS: TimeUnitEnum.HOURS,
  DAYS: TimeUnitEnum.DAYS,
} as const;

// Throttle type enum
const ThrottleTypeEnum = {
  FIXED: 'fixed',
  DYNAMIC: 'dynamic',
} as const;

type ThrottleTimeUnit = (typeof ThrottleTimeUnitEnum)[keyof typeof ThrottleTimeUnitEnum];
type ThrottleType = (typeof ThrottleTypeEnum)[keyof typeof ThrottleTypeEnum];

export class ThrottleControlDto extends SkipControlDto {
  @ApiProperty({
    description: 'The type of throttle window.',
    enum: ThrottleTypeEnum,
    default: 'fixed',
  })
  @IsEnum(ThrottleTypeEnum)
  @IsOptional()
  type?: ThrottleType;

  @ApiPropertyOptional({
    description: 'The amount of time for the throttle window (required for fixed type).',
    type: Number,
    minimum: 1,
  })
  @IsNumber()
  @Min(1)
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional({
    description: 'The unit of time for the throttle window (required for fixed type).',
    enum: ThrottleTimeUnitEnum,
  })
  @IsEnum(ThrottleTimeUnitEnum)
  @IsOptional()
  unit?: ThrottleTimeUnit;

  @ApiPropertyOptional({
    description: 'Key path to retrieve dynamic window value (required for dynamic type).',
    type: String,
    example: 'payload.timestamp',
  })
  @IsString()
  @MinLength(1)
  @IsOptional()
  dynamicKey?: string;

  @ApiPropertyOptional({
    description: 'The maximum number of executions allowed within the window. Defaults to 1.',
    type: Number,
    minimum: 1,
    default: 1,
  })
  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  threshold?: number;

  @ApiPropertyOptional({
    description:
      'Optional key for grouping throttle rules. If not provided, defaults to workflow and subscriber combination.',
    type: String,
  })
  @IsString()
  @IsOptional()
  throttleKey?: string;
}
