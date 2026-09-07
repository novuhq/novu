import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, ValidateNested } from 'class-validator';
import { IsTime12HourFormat } from '../validators/is-time-12-hour-format.validator';
import { WeeklyScheduleValidation } from '../validators/weekly-schedule-disabled.validator';

export class TimeRangeDto {
  @ApiProperty({
    type: String,
    description: 'Start time',
    example: '09:00 AM',
  })
  @IsString()
  @IsTime12HourFormat()
  readonly start: string;

  @ApiProperty({
    type: String,
    description: 'End time',
    example: '05:00 PM',
  })
  @IsString()
  @IsTime12HourFormat()
  readonly end: string;
}
export class DayScheduleDto {
  @ApiProperty({
    type: Boolean,
    description: 'Day schedule enabled',
    example: true,
  })
  @IsBoolean()
  readonly isEnabled: boolean;

  @ApiPropertyOptional({
    type: [TimeRangeDto],
    description: 'Hours',
    example: [{ start: '09:00 AM', end: '05:00 PM' }],
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => TimeRangeDto)
  readonly hours?: TimeRangeDto[];
}

export class WeeklyScheduleDto {
  @ApiPropertyOptional({
    type: DayScheduleDto,
    description: 'Monday schedule',
    example: {
      isEnabled: true,
      hours: [{ start: '09:00 AM', end: '05:00 PM' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  readonly monday?: DayScheduleDto;

  @ApiPropertyOptional({
    type: DayScheduleDto,
    description: 'Tuesday schedule',
    example: {
      isEnabled: true,
      hours: [{ start: '09:00 AM', end: '05:00 PM' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  readonly tuesday?: DayScheduleDto;

  @ApiPropertyOptional({
    type: DayScheduleDto,
    description: 'Wednesday schedule',
    example: {
      isEnabled: true,
      hours: [{ start: '09:00 AM', end: '05:00 PM' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  readonly wednesday?: DayScheduleDto;

  @ApiPropertyOptional({
    type: DayScheduleDto,
    description: 'Thursday schedule',
    example: {
      isEnabled: true,
      hours: [{ start: '09:00 AM', end: '05:00 PM' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  readonly thursday?: DayScheduleDto;

  @ApiPropertyOptional({
    type: DayScheduleDto,
    description: 'Friday schedule',
    example: {
      isEnabled: true,
      hours: [{ start: '09:00 AM', end: '05:00 PM' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  readonly friday?: DayScheduleDto;

  @ApiPropertyOptional({
    type: DayScheduleDto,
    description: 'Saturday schedule',
    example: {
      isEnabled: true,
      hours: [{ start: '09:00 AM', end: '05:00 PM' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  readonly saturday?: DayScheduleDto;

  @ApiPropertyOptional({
    type: DayScheduleDto,
    description: 'Sunday schedule',
    example: {
      isEnabled: true,
      hours: [{ start: '09:00 AM', end: '05:00 PM' }],
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => DayScheduleDto)
  readonly sunday?: DayScheduleDto;
}

export class ScheduleDto {
  @ApiProperty({
    type: Boolean,
    description: 'Schedule enabled',
    example: true,
  })
  @IsBoolean()
  readonly isEnabled: boolean;

  @ApiPropertyOptional({
    type: WeeklyScheduleDto,
    description: 'Weekly schedule',
    example: {
      monday: {
        isEnabled: true,
        hours: [{ start: '09:00 AM', end: '05:00 PM' }],
      },
      tuesday: {
        isEnabled: true,
        hours: [{ start: '09:00 AM', end: '05:00 PM' }],
      },
      wednesday: {
        isEnabled: true,
        hours: [{ start: '09:00 AM', end: '05:00 PM' }],
      },
      thursday: {
        isEnabled: true,
        hours: [{ start: '09:00 AM', end: '05:00 PM' }],
      },
      friday: {
        isEnabled: true,
        hours: [{ start: '09:00 AM', end: '05:00 PM' }],
      },
      saturday: {
        isEnabled: true,
        hours: [{ start: '09:00 AM', end: '05:00 PM' }],
      },
      sunday: {
        isEnabled: true,
        hours: [{ start: '09:00 AM', end: '05:00 PM' }],
      },
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  @WeeklyScheduleValidation()
  readonly weeklySchedule?: WeeklyScheduleDto;
}
