import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ScheduleDto } from '../../shared/dtos/schedule';

export class UpdatePreferencesRequestDto {
  @IsOptional()
  @IsBoolean()
  readonly email?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly sms?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly in_app?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly chat?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly push?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => ScheduleDto)
  readonly schedule?: ScheduleDto;
}
